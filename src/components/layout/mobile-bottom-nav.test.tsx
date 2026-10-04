import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileBottomNav } from './mobile-bottom-nav';
import { MobileNavProvider } from '@/contexts/mobile-nav-context';

vi.mock('next/navigation', () => ({
  usePathname: () => '/inbox',
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: { count?: number }) => {
    if (values?.count !== undefined) {
      return `${key}:${values.count}`;
    }
    return key;
  },
}));

vi.mock('@/hooks/use-total-unread', () => ({
  useTotalUnread: () => 5,
}));

describe('MobileBottomNav component', () => {
  it('renders all 4 tabs when not hidden', () => {
    const html = renderToStaticMarkup(
      <MobileNavProvider>
        <MobileBottomNav />
      </MobileNavProvider>
    );

    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/inbox"');
    expect(html).toContain('href="/broadcasts"');
    expect(html).toContain('href="/contacts"');
    expect(html).toContain('5'); // Unread badge
    expect(html).toContain('aria-current="page"'); // Active on /inbox
  });
});
