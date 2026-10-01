export interface ColumnMapping {
  phone: string | null;
  name: string | null;
  email: string | null;
  company: string | null;
  tags: string | null;
}

/** Patterns used to identify columns from messy human spreadsheets */
const COLUMN_PATTERNS = {
  phone: [
    /^(phone|mobile|contact|cell|whatsapp|tel|ph|number|cellphone)$/i,
    /^(phone[_\s]?number|mobile[_\s]?number|contact[_\s]?number|cell[_\s]?number|whatsapp[_\s]?number|wa[_\s]?number)$/i,
    /^(mobile[_\s]?no|contact[_\s]?no|phone[_\s]?no|tel[_\s]?no|cell[_\s]?no|ph[_\s]?no)$/i,
    /^(customer[_\s]?phone|customer[_\s]?mobile|client[_\s]?phone|client[_\s]?mobile|party[_\s]?phone|party[_\s]?mobile)$/i,
    /(phone|mobile|whatsapp|contact)/i,
  ],
  name: [
    /^(name|full[_\s]?name|customer[_\s]?name|client[_\s]?name|contact[_\s]?name|party[_\s]?name|lead[_\s]?name)$/i,
    /^(first[_\s]?name|given[_\s]?name|person[_\s]?name)$/i,
    /(customer|client|full[_\s]?name|person)/i,
    /^name$/i,
  ],
  email: [
    /^(email|e-mail|mail|email[_\s]?address|e-mail[_\s]?address|customer[_\s]?email)$/i,
    /(email|e-mail)/i,
  ],
  company: [
    /^(company|organization|org|business|shop|firm|enterprise|company[_\s]?name|business[_\s]?name|store[_\s]?name)$/i,
    /(company|org|business|shop|firm|store)/i,
  ],
  tags: [
    /^(tags|tag|labels|group|groups|category|categories|segment|segments|list|type)$/i,
    /(tag|label|group|segment|category)/i,
  ],
} as const;

/**
 * Automatically detects which headers match Phone, Name, Email, Company, Tags.
 * Tries exact matches first, then falls back to fuzzy/containment matches.
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const result: ColumnMapping = {
    phone: null,
    name: null,
    email: null,
    company: null,
    tags: null,
  };

  const assigned = new Set<string>();

  const fields: Array<keyof ColumnMapping> = ['phone', 'name', 'email', 'company', 'tags'];

  for (const field of fields) {
    const patterns = COLUMN_PATTERNS[field];

    // Priority 1: Exact matches against early high-confidence patterns
    for (const pattern of patterns) {
      if (result[field]) break;
      for (const h of headers) {
        const clean = h.trim();
        if (assigned.has(clean)) continue;
        if (pattern.test(clean)) {
          result[field] = clean;
          assigned.add(clean);
          break;
        }
      }
    }
  }

  return result;
}
