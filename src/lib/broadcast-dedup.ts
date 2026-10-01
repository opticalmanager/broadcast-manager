/**
 * Utilities for campaign history and smart audience de-duplication.
 */

export interface PastRecipientRecord {
  contact_id: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed' | string;
}

/**
 * Filter an array of contacts to exclude those who have already received this template.
 *
 * - By default (excludeFailed = false), contacts whose previous attempt failed
 *   are NOT excluded, allowing users to retry them safely.
 * - When excludeFailed = true, contacts with any prior delivery attempt (including failed)
 *   are excluded to avoid repeatedly pinging unreachable numbers.
 */
export function filterAlreadySentContacts<T extends { id: string }>(
  contacts: T[],
  pastRecipients: PastRecipientRecord[],
  options?: { excludeFailed?: boolean },
): T[] {
  const excludeFailed = Boolean(options?.excludeFailed);
  const excludedContactIds = new Set<string>();

  for (const recipient of pastRecipients) {
    if (!recipient.contact_id) continue;
    if (!excludeFailed && recipient.status === 'failed') {
      // Allow retry of failed attempts
      continue;
    }
    excludedContactIds.add(recipient.contact_id);
  }

  return contacts.filter((contact) => !excludedContactIds.has(contact.id));
}

/**
 * Formats a relative timestamp into human-readable compact format:
 * e.g. "Just now", "15m ago", "3h ago", "2d ago", "1mo ago", "1y ago".
 */
export function formatRelativeCampaignTime(
  dateInput: string | Date | number,
  nowInput: Date = new Date(),
): string {
  const date = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput);
  const now = nowInput.getTime();
  const diffMs = now - date.getTime();

  if (diffMs <= 0 || isNaN(diffMs)) return 'Just now';

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}
