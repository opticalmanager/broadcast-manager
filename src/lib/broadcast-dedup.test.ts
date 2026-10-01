import { describe, expect, it } from 'vitest';
import {
  filterAlreadySentContacts,
  formatRelativeCampaignTime,
  PastRecipientRecord,
} from './broadcast-dedup';

describe('formatRelativeCampaignTime', () => {
  const baseNow = new Date('2026-10-01T12:00:00Z');

  it('returns "Just now" for times less than 60 seconds ago or in the future', () => {
    expect(formatRelativeCampaignTime('2026-10-01T12:00:00Z', baseNow)).toBe('Just now');
    expect(formatRelativeCampaignTime('2026-10-01T11:59:45Z', baseNow)).toBe('Just now');
    expect(formatRelativeCampaignTime('2026-10-01T12:05:00Z', baseNow)).toBe('Just now');
    expect(formatRelativeCampaignTime('invalid-date', baseNow)).toBe('Just now');
  });

  it('returns minutes ago for < 60 minutes', () => {
    expect(formatRelativeCampaignTime('2026-10-01T11:55:00Z', baseNow)).toBe('5m ago');
    expect(formatRelativeCampaignTime('2026-10-01T11:01:00Z', baseNow)).toBe('59m ago');
  });

  it('returns hours ago for < 24 hours', () => {
    expect(formatRelativeCampaignTime('2026-10-01T10:00:00Z', baseNow)).toBe('2h ago');
    expect(formatRelativeCampaignTime('2026-09-30T13:00:00Z', baseNow)).toBe('23h ago');
  });

  it('returns days ago for < 30 days', () => {
    expect(formatRelativeCampaignTime('2026-09-30T12:00:00Z', baseNow)).toBe('1d ago');
    expect(formatRelativeCampaignTime('2026-09-28T12:00:00Z', baseNow)).toBe('3d ago');
    expect(formatRelativeCampaignTime('2026-09-02T12:00:00Z', baseNow)).toBe('29d ago');
  });

  it('returns months ago for < 12 months', () => {
    expect(formatRelativeCampaignTime('2026-08-01T12:00:00Z', baseNow)).toBe('2mo ago');
  });

  it('returns years ago for >= 365 days', () => {
    expect(formatRelativeCampaignTime('2025-05-01T12:00:00Z', baseNow)).toBe('1y ago');
  });
});

describe('filterAlreadySentContacts', () => {
  const contacts = [
    { id: 'c1', name: 'Alice', phone: '+1111111111' },
    { id: 'c2', name: 'Bob', phone: '+2222222222' },
    { id: 'c3', name: 'Charlie', phone: '+3333333333' },
    { id: 'c4', name: 'Dave', phone: '+4444444444' },
  ];

  it('returns all contacts when pastRecipients is empty', () => {
    const result = filterAlreadySentContacts(contacts, []);
    expect(result).toHaveLength(4);
    expect(result.map((c) => c.id)).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('excludes contacts who successfully received the template', () => {
    const pastRecipients: PastRecipientRecord[] = [
      { contact_id: 'c1', status: 'sent' },
      { contact_id: 'c2', status: 'delivered' },
    ];
    const result = filterAlreadySentContacts(contacts, pastRecipients);
    expect(result.map((c) => c.id)).toEqual(['c3', 'c4']);
  });

  it('allows retrying contacts whose previous send failed when excludeFailed is false (default)', () => {
    const pastRecipients: PastRecipientRecord[] = [
      { contact_id: 'c1', status: 'sent' },
      { contact_id: 'c2', status: 'failed' },
    ];
    const result = filterAlreadySentContacts(contacts, pastRecipients, {
      excludeFailed: false,
    });
    // c1 excluded (sent), c2 kept because previous send failed and excludeFailed is false
    expect(result.map((c) => c.id)).toEqual(['c2', 'c3', 'c4']);
  });

  it('excludes contacts with failed sends when excludeFailed is true', () => {
    const pastRecipients: PastRecipientRecord[] = [
      { contact_id: 'c1', status: 'sent' },
      { contact_id: 'c2', status: 'failed' },
    ];
    const result = filterAlreadySentContacts(contacts, pastRecipients, {
      excludeFailed: true,
    });
    // Both c1 and c2 excluded
    expect(result.map((c) => c.id)).toEqual(['c3', 'c4']);
  });

  it('ignores records with null or undefined contact_id', () => {
    const pastRecipients: PastRecipientRecord[] = [
      { contact_id: null, status: 'sent' },
      { contact_id: 'c1', status: 'read' },
    ];
    const result = filterAlreadySentContacts(contacts, pastRecipients);
    expect(result.map((c) => c.id)).toEqual(['c2', 'c3', 'c4']);
  });
});
