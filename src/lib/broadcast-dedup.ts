/**
 * Utilities for campaign history and smart audience de-duplication.
 */

import { isPausedError } from './broadcast-status';

export interface PastRecipientRecord {
  contact_id: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed' | 'paused' | string;
  error_message?: string | null;
}

/**
 * Filter an array of contacts to exclude those who have already received this template.
 *
 * - Contacts whose previous attempt was PAUSED (or failed due to pause) are NEVER
 *   treated as failed contacts and are NOT excluded — allowing them to receive the campaign.
 * - By default (excludeFailed = false), contacts whose previous attempt failed
 *   are NOT excluded, allowing users to retry them safely.
 * - When excludeFailed = true, contacts with genuine failure (unreachable numbers)
 *   are excluded. Paused contacts are still NOT excluded.
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

    // Check if this recipient was paused or failed due to pause
    const isPaused =
      recipient.status === 'paused' ||
      (recipient.status === 'failed' && isPausedError(recipient.error_message));

    // Paused contacts NEVER count as failed contacts and have not received the template.
    // They are always eligible to receive the campaign (never excluded here).
    if (isPaused) {
      continue;
    }

    // Pending contacts have not received the template yet.
    if (recipient.status === 'pending') {
      continue;
    }

    // If status is failed: only exclude if the user explicitly enabled excludeFailed.
    if (recipient.status === 'failed') {
      if (!excludeFailed) {
        continue;
      }
      excludedContactIds.add(recipient.contact_id);
      continue;
    }

    // Truly sent / delivered / read / replied: recipient received the template.
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
