import { describe, expect, it } from 'vitest';
import { smartNormalizePhone } from './smart-phone-normalize';

describe('smartNormalizePhone', () => {
  it('handles standard 10-digit Indian numbers by adding +91', () => {
    const res = smartNormalizePhone('9810064798', '+91');
    expect(res.isValid).toBe(true);
    expect(res.phone).toBe('+919810064798');
    expect(res.normalized).toBe('919810064798');
    expect(res.autoFormatted).toBe(true);
  });

  it('handles 11-digit numbers starting with 0 by stripping 0 and adding +91', () => {
    const res = smartNormalizePhone('09810064798', '+91');
    expect(res.isValid).toBe(true);
    expect(res.phone).toBe('+919810064798');
    expect(res.normalized).toBe('919810064798');
    expect(res.autoFormatted).toBe(true);
  });

  it('handles 12-digit numbers starting with 91 by adding +', () => {
    const res = smartNormalizePhone('919810064798', '+91');
    expect(res.isValid).toBe(true);
    expect(res.phone).toBe('+919810064798');
    expect(res.normalized).toBe('919810064798');
    expect(res.autoFormatted).toBe(true);
  });

  it('handles formatted numbers with spaces, parentheses, dashes', () => {
    const res = smartNormalizePhone('+91 (981) 006-4798');
    expect(res.isValid).toBe(true);
    expect(res.phone).toBe('+919810064798');
  });

  it('handles numbers already with + and country code', () => {
    const res = smartNormalizePhone('+14155552671');
    expect(res.isValid).toBe(true);
    expect(res.phone).toBe('+14155552671');
    expect(res.normalized).toBe('14155552671');
    expect(res.autoFormatted).toBe(false);
  });

  it('handles numeric input and Excel floats', () => {
    const res = smartNormalizePhone(9810064798, '+91');
    expect(res.isValid).toBe(true);
    expect(res.phone).toBe('+919810064798');
  });

  it('rejects numbers with alphabetical letters', () => {
    const res = smartNormalizePhone('98100ABCD');
    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('letters');
  });

  it('rejects incomplete numbers', () => {
    const res = smartNormalizePhone('12345', '+91');
    expect(res.isValid).toBe(false);
    expect(res.reason).toContain('Incomplete');
  });

  it('handles empty input gracefully', () => {
    expect(smartNormalizePhone('').isValid).toBe(false);
    expect(smartNormalizePhone(null).isValid).toBe(false);
    expect(smartNormalizePhone(undefined).isValid).toBe(false);
  });
});
