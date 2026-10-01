import { describe, expect, it } from 'vitest';
import { autoDetectColumns } from './smart-column-matcher';

describe('autoDetectColumns', () => {
  it('detects standard lowercase headers', () => {
    const headers = ['phone', 'name', 'email', 'company', 'tags'];
    expect(autoDetectColumns(headers)).toEqual({
      phone: 'phone',
      name: 'name',
      email: 'email',
      company: 'company',
      tags: 'tags',
    });
  });

  it('detects typical Indian & CRM export headers', () => {
    const headers = ['Customer Name', 'Mobile Number', 'Email Address', 'Shop Name', 'Category'];
    expect(autoDetectColumns(headers)).toEqual({
      phone: 'Mobile Number',
      name: 'Customer Name',
      email: 'Email Address',
      company: 'Shop Name',
      tags: 'Category',
    });
  });

  it('detects variations like Contact No, Party Name, WhatsApp', () => {
    const headers = ['Party Name', 'Contact No', 'Mail', 'Firm'];
    expect(autoDetectColumns(headers)).toEqual({
      phone: 'Contact No',
      name: 'Party Name',
      email: 'Mail',
      company: 'Firm',
      tags: null,
    });
  });

  it('handles empty or unrecognized headers', () => {
    const headers = ['Foo', 'Bar', 'Baz'];
    expect(autoDetectColumns(headers)).toEqual({
      phone: null,
      name: null,
      email: null,
      company: null,
      tags: null,
    });
  });
});
