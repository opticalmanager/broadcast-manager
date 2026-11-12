import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Stub the Meta resumable upload so the helper is tested in isolation.
vi.mock('./meta-api', () => ({
  uploadResumableMedia: vi.fn(async () => ({ handle: 'HANDLE123' })),
}));

// The SSRF guard does a real DNS lookup, so stub it — the fixtures below use
// a `.test` hostname that would never resolve. Each test sets the verdict.
vi.mock('@/lib/webhooks/ssrf', () => ({
  isDeliverableUrl: vi.fn(async () => true),
}));

import { ensureMediaHeaderHandle } from './template-header-handle';
import { uploadResumableMedia } from './meta-api';
import { isDeliverableUrl } from '@/lib/webhooks/ssrf';
import type { TemplatePayload } from './template-validators';

const MB = 1024 * 1024;
const APP_ID = 'app-1';

function payload(over: Partial<TemplatePayload> = {}): TemplatePayload {
  return {
    name: 't',
    category: 'Utility',
    language: 'en_US',
    body_text: 'hi',
    header_type: 'image',
    header_media_url: 'https://x.test/img.jpg',
    ...over,
  };
}

function mediaResponse(type: string | null = 'image/jpeg', size = 1024, ok = true, status = 200): Response {
  return {
    ok,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? type : null) },
    arrayBuffer: async () => new ArrayBuffer(size),
  } as unknown as Response;
}

/** The (fileName, mimeType) pair the helper handed to the Resumable Upload. */
function uploadedAs(): { fileName: string; mimeType: string } {
  const args = vi.mocked(uploadResumableMedia).mock.calls[0][0];
  return { fileName: args.fileName, mimeType: args.mimeType };
}

describe('ensureMediaHeaderHandle', () => {
  beforeEach(() => {
    vi.mocked(uploadResumableMedia).mockClear();
    vi.mocked(isDeliverableUrl).mockClear();
    vi.mocked(isDeliverableUrl).mockResolvedValue(true);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('is a no-op for non-media headers', async () => {
    const p = payload({ header_type: 'text', header_content: 'Hi' });
    await ensureMediaHeaderHandle(p, 'tok', APP_ID);
    expect(uploadResumableMedia).not.toHaveBeenCalled();
    expect(p.header_handle).toBeUndefined();
  });

  it('is a no-op when a handle already exists', async () => {
    const p = payload({ header_handle: 'existing' });
    await ensureMediaHeaderHandle(p, 'tok', APP_ID);
    expect(uploadResumableMedia).not.toHaveBeenCalled();
    expect(p.header_handle).toBe('existing');
  });

  it('throws an actionable error when Meta App ID is unset or empty', async () => {
    const p = payload();
    await expect(ensureMediaHeaderHandle(p, 'tok')).rejects.toThrow(/Meta App ID/i);
    await expect(ensureMediaHeaderHandle(p, 'tok', null)).rejects.toThrow(/Meta App ID/i);
    await expect(ensureMediaHeaderHandle(p, 'tok', '')).rejects.toThrow(/Meta App ID/i);
    await expect(ensureMediaHeaderHandle(p, 'tok', '   ')).rejects.toThrow(/Meta App ID/i);
  });

  describe('image headers (unchanged from #230)', () => {
    it('derives + sets header_handle from a valid image URL', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('image/jpeg', 2048)));
      const p = payload();
      await ensureMediaHeaderHandle(p, 'tok', APP_ID);
      expect(uploadResumableMedia).toHaveBeenCalledOnce();
      expect(uploadedAs()).toEqual({ fileName: 'header.jpg', mimeType: 'image/jpeg' });
      expect(p.header_handle).toBe('HANDLE123');
    });

    it('names a PNG sample header.png', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('image/png', 2048)));
      await ensureMediaHeaderHandle(payload(), 'tok', APP_ID);
      expect(uploadedAs()).toEqual({ fileName: 'header.png', mimeType: 'image/png' });
    });

    it('assumes JPEG when the sample has no Content-Type', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse(null, 2048)));
      await ensureMediaHeaderHandle(payload(), 'tok', APP_ID);
      expect(uploadedAs()).toEqual({ fileName: 'header.jpg', mimeType: 'image/jpeg' });
    });

    it('rejects a non-image content type', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('text/html')));
      await expect(ensureMediaHeaderHandle(payload(), 'tok', APP_ID)).rejects.toThrow(
        /Header image must be JPEG or PNG/,
      );
    });

    it('rejects an image over 5 MB', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('image/png', 6 * MB)));
      await expect(ensureMediaHeaderHandle(payload(), 'tok', APP_ID)).rejects.toThrow(/5 MB/);
    });
  });

  describe('document headers', () => {
    const doc = (over: Partial<TemplatePayload> = {}) =>
      payload({ header_type: 'document', header_media_url: 'https://x.test/terms.pdf', ...over });

    it('derives + sets header_handle from a PDF URL', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('application/pdf', 4 * MB)));
      const p = doc();
      await ensureMediaHeaderHandle(p, 'tok', APP_ID);
      expect(uploadResumableMedia).toHaveBeenCalledOnce();
      expect(uploadedAs()).toEqual({ fileName: 'header.pdf', mimeType: 'application/pdf' });
      expect(p.header_handle).toBe('HANDLE123');
    });

    it('accepts Office documents and names them by type', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          mediaResponse(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            1024,
          ),
        ),
      );
      await ensureMediaHeaderHandle(doc(), 'tok', APP_ID);
      expect(uploadedAs()).toEqual({
        fileName: 'header.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    });

    it('assumes PDF when the sample has no Content-Type', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse(null, 1024)));
      await ensureMediaHeaderHandle(doc(), 'tok', APP_ID);
      expect(uploadedAs()).toEqual({ fileName: 'header.pdf', mimeType: 'application/pdf' });
    });

    it('rejects a non-document content type with a clear message', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('image/jpeg')));
      await expect(ensureMediaHeaderHandle(doc(), 'tok', APP_ID)).rejects.toThrow(
        /Header document must be PDF, Word, PowerPoint, Excel or plain text \(got image\/jpeg\)/,
      );
      expect(uploadResumableMedia).not.toHaveBeenCalled();
    });

    it('allows documents above the 16 MB chat-media bucket cap (Meta allows 100 MB)', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('application/pdf', 40 * MB)));
      await ensureMediaHeaderHandle(doc(), 'tok', APP_ID);
      expect(uploadResumableMedia).toHaveBeenCalledOnce();
    });

    it('rejects a document over 100 MB', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('application/pdf', 101 * MB)));
      await expect(ensureMediaHeaderHandle(doc(), 'tok', APP_ID)).rejects.toThrow(
        /Header document is 101\.0 MB — Meta's limit is 100 MB/,
      );
      expect(uploadResumableMedia).not.toHaveBeenCalled();
    });
  });

  describe('video headers', () => {
    const video = (over: Partial<TemplatePayload> = {}) =>
      payload({ header_type: 'video', header_media_url: 'https://x.test/promo.mp4', ...over });

    it('derives + sets header_handle from an MP4 URL', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('video/mp4', 8 * MB)));
      const p = video();
      await ensureMediaHeaderHandle(p, 'tok', APP_ID);
      expect(uploadResumableMedia).toHaveBeenCalledOnce();
      expect(uploadedAs()).toEqual({ fileName: 'header.mp4', mimeType: 'video/mp4' });
      expect(p.header_handle).toBe('HANDLE123');
    });

    it('accepts 3GPP', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('video/3gpp', 1024)));
      await ensureMediaHeaderHandle(video(), 'tok', APP_ID);
      expect(uploadedAs()).toEqual({ fileName: 'header.3gp', mimeType: 'video/3gpp' });
    });

    it('rejects a non-video content type', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('video/quicktime')));
      await expect(ensureMediaHeaderHandle(video(), 'tok', APP_ID)).rejects.toThrow(
        /Header video must be MP4 or 3GPP \(got video\/quicktime\)/,
      );
    });

    it('rejects a video over 16 MB', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse('video/mp4', 17 * MB)));
      await expect(ensureMediaHeaderHandle(video(), 'tok', APP_ID)).rejects.toThrow(/16 MB/);
      expect(uploadResumableMedia).not.toHaveBeenCalled();
    });
  });

  it('refuses a non-public header URL without fetching it', async () => {
    vi.mocked(isDeliverableUrl).mockResolvedValue(false);
    const fetchSpy = vi.fn(async () => mediaResponse('application/json'));
    vi.stubGlobal('fetch', fetchSpy);

    const p = payload({ header_media_url: 'http://169.254.169.254/latest/meta-data/' });
    await expect(ensureMediaHeaderHandle(p, 'tok', APP_ID)).rejects.toThrow(/publicly reachable/);

    expect(isDeliverableUrl).toHaveBeenCalledWith('http://169.254.169.254/latest/meta-data/');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(uploadResumableMedia).not.toHaveBeenCalled();
    expect(p.header_handle).toBeUndefined();
  });

  it('applies the same guard to document and video headers', async () => {
    vi.mocked(isDeliverableUrl).mockResolvedValue(false);
    const fetchSpy = vi.fn(async () => mediaResponse('application/pdf'));
    vi.stubGlobal('fetch', fetchSpy);

    for (const header_type of ['document', 'video'] as const) {
      const p = payload({ header_type, header_media_url: 'http://10.0.0.5/internal.pdf' });
      await expect(ensureMediaHeaderHandle(p, 'tok', APP_ID)).rejects.toThrow(/publicly reachable/);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(uploadResumableMedia).not.toHaveBeenCalled();
  });

  it('reports a blocked URL exactly like an unreachable one, for every media kind', async () => {
    const messages = new Set<string>();
    for (const header_type of ['image', 'video', 'document'] as const) {
      vi.mocked(isDeliverableUrl).mockResolvedValue(false);
      vi.stubGlobal('fetch', vi.fn(async () => mediaResponse()));
      const blocked = await ensureMediaHeaderHandle(payload({ header_type }), 'tok', APP_ID).catch(
        (e: Error) => e.message,
      );

      vi.mocked(isDeliverableUrl).mockResolvedValue(true);
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new Error('ECONNREFUSED');
        }),
      );
      const unreachable = await ensureMediaHeaderHandle(payload({ header_type }), 'tok', APP_ID).catch(
        (e: Error) => e.message,
      );

      expect(blocked).toBe(unreachable);
      messages.add(blocked as string);
    }
    // The message must not vary by header kind either — otherwise the
    // kind becomes an extra bit of information about the refused URL.
    expect(messages.size).toBe(1);
  });

  it('does not follow redirects, so a public URL cannot bounce to an internal one', async () => {
    const fetchSpy = vi.fn(async () => mediaResponse('image/jpeg', 1024));
    vi.stubGlobal('fetch', fetchSpy);

    await ensureMediaHeaderHandle(payload(), 'tok', APP_ID);

    const init = (fetchSpy.mock.calls[0] as unknown[])[1] as RequestInit;
    expect(init).toMatchObject({ redirect: 'manual' });
  });
});
