import { describe, expect, it, vi } from 'vitest';
import { calculateAudienceReach, AudienceConfig } from './broadcast-audience';

function createMockSupabase(tables: Record<string, any[] | ((query: any) => any)>) {
  return {
    from: (tableName: string) => {
      let selectedFields: string | undefined;
      let countOpts: any = null;
      let filterEq: Record<string, any> = {};
      let filterNeq: Record<string, any> = {};
      let filterIn: Record<string, any[]> = {};
      let rangeVal: [number, number] | null = null;

      const builder: any = {
        select: vi.fn((fields: string, opts?: any) => {
          selectedFields = fields;
          countOpts = opts;
          return builder;
        }),
        eq: vi.fn((col: string, val: any) => {
          filterEq[col] = val;
          return builder;
        }),
        neq: vi.fn((col: string, val: any) => {
          filterNeq[col] = val;
          return builder;
        }),
        in: vi.fn((col: string, vals: any[]) => {
          filterIn[col] = vals;
          return builder;
        }),
        ilike: vi.fn(() => builder),
        range: vi.fn((from: number, to: number) => {
          rangeVal = [from, to];
          return builder;
        }),
        then: (resolve: any) => {
          const tableData = tables[tableName];
          if (typeof tableData === 'function') {
            const res = tableData({
              fields: selectedFields,
              countOpts,
              filterEq,
              filterNeq,
              filterIn,
              rangeVal,
            });
            return Promise.resolve(res).then(resolve);
          }

          let rows = [...(tableData ?? [])];

          // Filter by eq
          for (const [k, v] of Object.entries(filterEq)) {
            rows = rows.filter((r) => r[k] === v);
          }
          // Filter by neq
          for (const [k, v] of Object.entries(filterNeq)) {
            rows = rows.filter((r) => r[k] !== v);
          }
          // Filter by in
          for (const [k, v] of Object.entries(filterIn)) {
            rows = rows.filter((r) => v.includes(r[k]));
          }

          let resultData = rows;
          if (rangeVal) {
            resultData = rows.slice(rangeVal[0], rangeVal[1] + 1);
          }

          if (countOpts?.head) {
            return Promise.resolve({ data: null, count: rows.length, error: null }).then(resolve);
          }

          return Promise.resolve({ data: resultData, count: rows.length, error: null }).then(resolve);
        },
      };

      return builder;
    },
  } as any;
}

describe('calculateAudienceReach', () => {
  it('calculates total reach for "all" audience with no exclusions', async () => {
    const contacts = Array.from({ length: 1500 }, (_, i) => ({ id: `c-${i}` }));
    const supabase = createMockSupabase({ contacts });

    const audience: AudienceConfig = { type: 'all' };
    const res = await calculateAudienceReach(supabase, audience);

    expect(res.rawBaseCount).toBe(1500);
    expect(res.estimatedCount).toBe(1500);
    expect(res.dedupCount).toBe(0);
  });

  it('subtracts past template recipients when excludeAlreadySentThisTemplate is true', async () => {
    const contacts = Array.from({ length: 100 }, (_, i) => ({ id: `c-${i}` }));
    const broadcasts = [{ id: 'b-1', template_name: 'promo_v1' }];
    const pastRecipients = [
      { broadcast_id: 'b-1', contact_id: 'c-1', status: 'sent' },
      { broadcast_id: 'b-1', contact_id: 'c-2', status: 'delivered' },
      { broadcast_id: 'b-1', contact_id: 'c-3', status: 'failed' },
    ];

    const supabase = createMockSupabase({
      contacts,
      broadcasts,
      broadcast_recipients: pastRecipients,
    });

    // Case 1: excludeFailedSends = false (allows retrying c-3)
    const audienceRetryFailed: AudienceConfig = {
      type: 'all',
      excludeAlreadySentThisTemplate: true,
      excludeFailedSends: false,
    };
    const res1 = await calculateAudienceReach(supabase, audienceRetryFailed, {
      templateName: 'promo_v1',
    });
    // c-1 and c-2 excluded, c-3 kept
    expect(res1.rawBaseCount).toBe(100);
    expect(res1.dedupCount).toBe(2);
    expect(res1.estimatedCount).toBe(98);

    // Case 2: excludeFailedSends = true (excludes c-1, c-2, and c-3)
    const audienceExcludeFailed: AudienceConfig = {
      type: 'all',
      excludeAlreadySentThisTemplate: true,
      excludeFailedSends: true,
    };
    const res2 = await calculateAudienceReach(supabase, audienceExcludeFailed, {
      templateName: 'promo_v1',
    });
    expect(res2.rawBaseCount).toBe(100);
    expect(res2.dedupCount).toBe(3);
    expect(res2.estimatedCount).toBe(97);
  });

  it('correctly handles overlapping tag exclusions and dedup exclusions', async () => {
    const contacts = Array.from({ length: 10 }, (_, i) => ({ id: `c-${i}` }));
    const broadcasts = [{ id: 'b-1', template_name: 'promo' }];
    // c-1 is in past recipients
    const pastRecipients = [{ broadcast_id: 'b-1', contact_id: 'c-1', status: 'sent' }];
    // c-1 and c-2 are in excluded tag 'tag-vip'
    const contactTags = [
      { contact_id: 'c-1', tag_id: 'tag-vip' },
      { contact_id: 'c-2', tag_id: 'tag-vip' },
    ];

    const supabase = createMockSupabase({
      contacts,
      broadcasts,
      broadcast_recipients: pastRecipients,
      contact_tags: contactTags,
    });

    const audience: AudienceConfig = {
      type: 'all',
      excludeTagIds: ['tag-vip'],
      excludeAlreadySentThisTemplate: true,
    };
    const res = await calculateAudienceReach(supabase, audience, {
      templateName: 'promo',
    });

    // Total 10. Excluded: c-1 (both tag & dedup), c-2 (tag). Total unique excluded = 2.
    expect(res.rawBaseCount).toBe(10);
    expect(res.estimatedCount).toBe(8);
  });

  it('paginates past recipients queries when there are > 1,000 past recipients', async () => {
    const contacts = Array.from({ length: 3000 }, (_, i) => ({ id: `c-${i}` }));
    const broadcasts = [{ id: 'b-large', template_name: 'large_template' }];
    // 1,200 past recipients
    const pastRecipients = Array.from({ length: 1200 }, (_, i) => ({
      broadcast_id: 'b-large',
      contact_id: `c-${i}`,
      status: 'sent',
    }));

    const supabase = createMockSupabase({
      contacts,
      broadcasts,
      broadcast_recipients: pastRecipients,
    });

    const audience: AudienceConfig = {
      type: 'all',
      excludeAlreadySentThisTemplate: true,
    };
    const res = await calculateAudienceReach(supabase, audience, {
      templateName: 'large_template',
    });

    expect(res.rawBaseCount).toBe(3000);
    expect(res.dedupCount).toBe(1200);
    expect(res.estimatedCount).toBe(1800);
  });
});
