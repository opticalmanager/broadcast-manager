import { describe, it, expect } from 'vitest';
import manifest from './manifest';

describe('Web App Manifest', () => {
  it('returns valid PWA metadata', () => {
    const m = manifest();

    expect(m.name).toContain('Broadcast Manager');
    expect(m.short_name).toBe('Broadcast CRM');
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/');
    expect(m.theme_color).toBe('#22c55e');
    expect(m.background_color).toBe('#020617');
  });

  it('declares 192px and 512px standard and maskable icons', () => {
    const m = manifest();

    const icon192 = m.icons?.find((i) => i.sizes === '192x192' && i.purpose === 'any');
    const maskable192 = m.icons?.find((i) => i.sizes === '192x192' && i.purpose === 'maskable');
    const icon512 = m.icons?.find((i) => i.sizes === '512x512' && i.purpose === 'any');
    const maskable512 = m.icons?.find((i) => i.sizes === '512x512' && i.purpose === 'maskable');

    expect(icon192).toBeDefined();
    expect(maskable192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(maskable512).toBeDefined();

    expect(icon192?.src).toBe('/icons/icon-192x192.png');
    expect(icon512?.src).toBe('/icons/icon-512x512.png');
  });

  it('includes shortcuts for quick navigation', () => {
    const m = manifest();

    expect(m.shortcuts).toBeDefined();
    expect(m.shortcuts?.length).toBeGreaterThanOrEqual(3);

    const urls = m.shortcuts?.map((s) => s.url);
    expect(urls).toContain('/inbox');
    expect(urls).toContain('/broadcasts');
    expect(urls).toContain('/contacts');
  });
});
