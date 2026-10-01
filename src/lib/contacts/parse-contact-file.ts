import * as XLSX from 'xlsx';

export interface ParsedRawFile {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

/**
 * Universal file reader for Contact Import:
 * Handles .xlsx, .xls, .csv, .tsv seamlessly using SheetJS.
 * Automatically formats numeric fields into plain strings (preventing float/scientific artifacts).
 */
export async function parseContactFile(file: File): Promise<ParsedRawFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: 'array',
    raw: false, // Ensures numbers like 9810064798 don't get converted to scientific notation
    cellDates: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // Convert sheet to json array of objects
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (rawData.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // Extract all distinct headers from the rows
  const headerSet = new Set<string>();
  for (const row of rawData) {
    for (const key of Object.keys(row)) {
      const clean = key.trim();
      if (clean && !clean.startsWith('__EMPTY')) {
        headerSet.add(clean);
      }
    }
  }

  const headers = Array.from(headerSet);

  // Normalize row keys and convert values to string
  const rows: Record<string, string>[] = [];
  for (const r of rawData) {
    const cleanRow: Record<string, string> = {};
    let hasAnyValue = false;
    for (const h of headers) {
      const val = r[h] !== undefined && r[h] !== null ? String(r[h]).trim() : '';
      cleanRow[h] = val;
      if (val) hasAnyValue = true;
    }
    if (hasAnyValue) {
      rows.push(cleanRow);
    }
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Generates and triggers download of a CSV file in the browser.
 * Useful for downloading skipped, existing, or invalid contact records.
 */
export function downloadCsv(filename: string, headers: string[], rows: Record<string, string>[]): void {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
