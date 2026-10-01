import { isValidE164, normalizePhone } from '@/lib/whatsapp/phone-utils';

export interface SmartPhoneNormalizeResult {
  /** Clean E.164 phone string with leading '+' if valid, or sanitized original if invalid */
  phone: string;
  /** Digits-only phone for database indexing/matching */
  normalized: string;
  /** True when the phone meets E.164 requirements and has a valid country code */
  isValid: boolean;
  /** Human-readable explanation if invalid */
  reason?: string;
  /** True if the number was modified (e.g. added +91 or +) */
  autoFormatted?: boolean;
}

/**
 * Industrial-grade phone normalizer that handles messy Excel & CSV inputs:
 * 1. Cleans noise (spaces, parentheses, dashes, dots, tabs).
 * 2. Unpacks scientific notation (e.g. 9.87654E+11) and strips float decimals (.0).
 * 3. Intelligently applies country code:
 *    - 10 digits (e.g. 9810012345) -> prepends defaultCountryCode (e.g. +919810012345)
 *    - 11 digits starting with 0 (e.g. 09810012345) -> strips 0, prepends defaultCountryCode
 *    - 12 digits starting with 91 (e.g. 919810012345) -> prepends '+' -> +919810012345
 *    - 11-15 digits starting with other valid country codes -> prepends '+'
 * 4. Validates final output against official E.164 standards (8-15 digits).
 */
export function smartNormalizePhone(
  raw: unknown,
  defaultCountryCode: string = '+91'
): SmartPhoneNormalizeResult {
  if (raw === null || raw === undefined) {
    return { phone: '', normalized: '', isValid: false, reason: 'Empty phone number' };
  }

  let str = String(raw).trim();
  if (!str) {
    return { phone: '', normalized: '', isValid: false, reason: 'Empty phone number' };
  }

  // Handle Excel float or scientific notation (e.g. 9.81001E+09, 9810012345.0)
  if (typeof raw === 'number' || /^[0-9.]+[eE][+-]?[0-9]+$/.test(str)) {
    const num = Number(raw);
    if (!isNaN(num) && isFinite(num)) {
      str = Math.trunc(num).toString();
    }
  } else if (/^\d+\.0+$/.test(str)) {
    str = str.split('.')[0];
  }

  // Remove whitespace, formatting noise: spaces, dots, dashes, parentheses, underscores
  const cleanNoise = str.replace(/[\s().\-_]/g, '');

  // Check if original contained letters
  if (/[a-zA-Z]/.test(cleanNoise)) {
    return {
      phone: str,
      normalized: normalizePhone(str),
      isValid: false,
      reason: 'Contains alphabetical letters',
    };
  }

  const cleanDefaultCc = defaultCountryCode.replace(/\D/g, ''); // e.g. '91'

  // Case A: Number already starts with '+'
  if (cleanNoise.startsWith('+')) {
    const digits = cleanNoise.slice(1).replace(/\D/g, '');
    if (!digits) {
      return { phone: cleanNoise, normalized: '', isValid: false, reason: 'No digits after +' };
    }
    if (digits.length < 8) {
      return { phone: cleanNoise, normalized: digits, isValid: false, reason: 'Too short (< 8 digits)' };
    }
    if (digits.length > 15) {
      return { phone: cleanNoise, normalized: digits, isValid: false, reason: 'Too long (> 15 digits)' };
    }
    const finalPhone = `+${digits}`;
    if (!isValidE164(finalPhone)) {
      return { phone: finalPhone, normalized: digits, isValid: false, reason: 'Invalid international format' };
    }
    return {
      phone: finalPhone,
      normalized: digits,
      isValid: true,
      autoFormatted: false,
    };
  }

  // Case B: Number does NOT start with '+'
  const digitsOnly = cleanNoise.replace(/\D/g, '');
  if (!digitsOnly) {
    return { phone: str, normalized: '', isValid: false, reason: 'No digits found' };
  }

  let finalDigits = digitsOnly;
  let autoFormatted = false;

  if (cleanDefaultCc) {
    // 10 digits national number (e.g. Indian mobile number: 9810012345)
    if (digitsOnly.length === 10) {
      finalDigits = `${cleanDefaultCc}${digitsOnly}`;
      autoFormatted = true;
    }
    // 11 digits starting with 0 (e.g. 09810012345)
    else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      finalDigits = `${cleanDefaultCc}${digitsOnly.slice(1)}`;
      autoFormatted = true;
    }
    // 12 digits starting with the country code (e.g. 919810012345)
    else if (digitsOnly.length === 12 && digitsOnly.startsWith(cleanDefaultCc)) {
      finalDigits = digitsOnly;
      autoFormatted = true;
    }
    // 11 to 15 digits (might already have another country code)
    else if (digitsOnly.length >= 11 && digitsOnly.length <= 15) {
      finalDigits = digitsOnly;
      autoFormatted = true;
    }
    // Less than 10 digits
    else if (digitsOnly.length < 10) {
      return {
        phone: digitsOnly,
        normalized: digitsOnly,
        isValid: false,
        reason: `Incomplete number (${digitsOnly.length} digits)`,
      };
    }
    // More than 15 digits
    else if (digitsOnly.length > 15) {
      return {
        phone: digitsOnly,
        normalized: digitsOnly,
        isValid: false,
        reason: `Too long (${digitsOnly.length} digits)`,
      };
    }
  } else {
    // No default country code selected
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      finalDigits = digitsOnly;
      autoFormatted = true;
    } else {
      return {
        phone: digitsOnly,
        normalized: digitsOnly,
        isValid: false,
        reason: 'Missing country code and invalid length',
      };
    }
  }

  const finalPhone = `+${finalDigits}`;
  if (!isValidE164(finalPhone)) {
    return {
      phone: finalPhone,
      normalized: finalDigits,
      isValid: false,
      reason: 'Invalid E.164 phone structure',
    };
  }

  return {
    phone: finalPhone,
    normalized: finalDigits,
    isValid: true,
    autoFormatted,
  };
}
