'use client';

import { useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { isUniqueViolation } from '@/lib/contacts/dedupe';
import {
  parseContactFile,
  downloadCsv,
  type ParsedRawFile,
} from '@/lib/contacts/parse-contact-file';
import {
  autoDetectColumns,
  type ColumnMapping,
} from '@/lib/contacts/smart-column-matcher';
import {
  smartNormalizePhone,
  type SmartPhoneNormalizeResult,
} from '@/lib/contacts/smart-phone-normalize';
import { parseTagCell } from '@/lib/contacts/parse-contact-csv';
import {
  assignImportedContactTags,
  resolveImportTagIds,
  type ContactTagAssignment,
} from '@/lib/contacts/resolve-import-tags';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Download,
  ArrowRight,
  ArrowLeft,
  Filter,
  Check,
  Tag,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

const DEFAULT_TAG_COLOR = '#3b82f6';
const PREVIEW_LIMIT = 5;

type Step = 1 | 2 | 3 | 4;

type ContactRowStatus = 'ready' | 'existing' | 'duplicate' | 'invalid';

interface ValidatedContactRow {
  index: number;
  originalPhone: string;
  normalizedResult: SmartPhoneNormalizeResult;
  name?: string;
  email?: string;
  company?: string;
  tagNames: string[];
  status: ContactRowStatus;
  reason: string;
}

const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'USA / Canada (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '', label: 'None (Keep as-is)' },
];

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportModal({
  open,
  onOpenChange,
  onImported,
}: ImportModalProps) {
  const t = useTranslations('Contacts.importModal');
  const supabase = createClient();
  const { accountId, canEditSettings } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [step, setStep] = useState<Step>(1);

  // Step 1: File
  const [file, setFile] = useState<File | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRawFile | null>(null);

  // Step 2: Mapping & Country Code
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    phone: null,
    name: null,
    email: null,
    company: null,
    tags: null,
  });
  const [defaultCountryCode, setDefaultCountryCode] = useState<string>('+91');

  // Step 3: Validated Rows & Analytics
  const [validating, setValidating] = useState(false);
  const [validatedRows, setValidatedRows] = useState<ValidatedContactRow[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | ContactRowStatus>('all');

  // Step 4: Import execution
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState('');
  const [importResult, setImportResult] = useState<{
    imported: number;
    tagsAssigned: number;
    skipped: number;
    failed: number;
  } | null>(null);

  function reset() {
    setStep(1);
    setFile(null);
    setParsingFile(false);
    setParsedData(null);
    setColumnMapping({
      phone: null,
      name: null,
      email: null,
      company: null,
      tags: null,
    });
    setDefaultCountryCode('+91');
    setValidating(false);
    setValidatedRows([]);
    setFilterTab('all');
    setImporting(false);
    setImportProgress(0);
    setImportStatusText('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  // Handle file upload
  async function handleFileSelect(selected: File | undefined) {
    if (!selected) return;

    setFile(selected);
    setParsingFile(true);

    try {
      const parsed = await parseContactFile(selected);
      if (parsed.totalRows === 0 || parsed.headers.length === 0) {
        toast.error('The selected file contains no readable rows or headers.');
        setFile(null);
        setParsedData(null);
        return;
      }

      setParsedData(parsed);

      // Auto-detect columns
      const autoMatched = autoDetectColumns(parsed.headers);
      setColumnMapping(autoMatched);

      // Advance to Step 2
      setStep(2);
      toast.success(`Loaded ${parsed.totalRows.toLocaleString()} rows from ${selected.name}`);
    } catch (err) {
      console.error('[ImportModal] Failed to parse file:', err);
      toast.error('Failed to parse file. Make sure it is a valid CSV or Excel (.xlsx) file.');
      setFile(null);
      setParsedData(null);
    } finally {
      setParsingFile(false);
    }
  }

  // Execute Step 3 Validation
  async function runValidation() {
    if (!parsedData || !columnMapping.phone || !accountId) return;

    setValidating(true);
    setStep(3);

    try {
      // 1. Fetch all existing normalized phones for this account from database
      const { data: existingRows, error: fetchErr } = await supabase
        .from('contacts')
        .select('phone_normalized')
        .eq('account_id', accountId);

      if (fetchErr) {
        throw new Error(`Failed to check existing contacts: ${fetchErr.message}`);
      }

      const existingInDb = new Set<string>(
        (existingRows ?? [])
          .map((r) => (r as { phone_normalized: string | null }).phone_normalized)
          .filter((p): p is string => !!p)
      );

      // 2. Process each row with smart normalization and deduplication
      const seenInFile = new Set<string>();
      const results: ValidatedContactRow[] = [];

      for (let i = 0; i < parsedData.rows.length; i++) {
        const rawRow = parsedData.rows[i];
        const rawPhone = rawRow[columnMapping.phone] ?? '';
        const name = columnMapping.name ? rawRow[columnMapping.name]?.trim() : undefined;
        const email = columnMapping.email ? rawRow[columnMapping.email]?.trim() : undefined;
        const company = columnMapping.company ? rawRow[columnMapping.company]?.trim() : undefined;
        const rawTags = columnMapping.tags ? rawRow[columnMapping.tags] : undefined;
        const tagNames = rawTags ? parseTagCell(rawTags) : [];

        // Smart Normalize Phone
        const normResult = smartNormalizePhone(rawPhone, defaultCountryCode);

        let status: ContactRowStatus = 'ready';
        let reason = 'Ready to import';

        if (!normResult.isValid) {
          status = 'invalid';
          reason = normResult.reason || 'Invalid phone format';
        } else if (seenInFile.has(normResult.normalized)) {
          status = 'duplicate';
          reason = 'Duplicate in uploaded file';
        } else if (existingInDb.has(normResult.normalized)) {
          status = 'existing';
          reason = 'Already exists in CRM';
        } else {
          seenInFile.add(normResult.normalized);
        }

        results.push({
          index: i + 1,
          originalPhone: String(rawPhone).trim(),
          normalizedResult: normResult,
          name: name || undefined,
          email: email || undefined,
          company: company || undefined,
          tagNames,
          status,
          reason,
        });
      }

      setValidatedRows(results);
    } catch (err) {
      console.error('[ImportModal] Validation error:', err);
      toast.error(err instanceof Error ? err.message : 'Validation failed');
      setStep(2); // Go back to mapping if validation failed
    } finally {
      setValidating(false);
    }
  }

  // KPI counts
  const kpis = useMemo(() => {
    let ready = 0;
    let existing = 0;
    let duplicate = 0;
    let invalid = 0;

    for (const r of validatedRows) {
      if (r.status === 'ready') ready++;
      else if (r.status === 'existing') existing++;
      else if (r.status === 'duplicate') duplicate++;
      else if (r.status === 'invalid') invalid++;
    }

    return {
      total: validatedRows.length,
      ready,
      existing,
      duplicate,
      invalid,
    };
  }, [validatedRows]);

  // Filtered rows for Step 3 table
  const displayedRows = useMemo(() => {
    if (filterTab === 'all') return validatedRows;
    return validatedRows.filter((r) => r.status === filterTab);
  }, [validatedRows, filterTab]);

  // Export skipped records to CSV
  function handleDownloadSkipped() {
    const skippedRows = validatedRows
      .filter((r) => r.status !== 'ready')
      .map((r) => ({
        'Row Number': String(r.index),
        'Original Phone': r.originalPhone,
        'Normalized Phone': r.normalizedResult.phone || '',
        'Name': r.name || '',
        'Status': r.status.toUpperCase(),
        'Reason': r.reason,
      }));

    if (skippedRows.length === 0) {
      toast.info('No skipped records to download.');
      return;
    }

    downloadCsv(
      `skipped_contacts_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Row Number', 'Original Phone', 'Normalized Phone', 'Name', 'Status', 'Reason'],
      skippedRows
    );
    toast.success(`Downloaded ${skippedRows.length} skipped records.`);
  }

  // Execute Step 4 Final Import
  async function handleExecuteImport() {
    const readyRows = validatedRows.filter((r) => r.status === 'ready');
    if (readyRows.length === 0) {
      toast.error('No valid new contacts available to import.');
      return;
    }

    setImporting(true);
    setStep(4);
    setImportProgress(0);
    setImportStatusText('Preparing contacts...');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      if (!accountId) throw new Error('Your profile is not linked to an account.');

      // 1. Resolve tags if any contacts have tags
      const allTagNames = readyRows.flatMap((r) => r.tagNames);
      let tagIdByKey = new Map<string, string>();
      if (allTagNames.length > 0) {
        setImportStatusText('Resolving and creating tags...');
        const res = await resolveImportTagIds(supabase, {
          accountId,
          userId: user.id,
          tagNames: allTagNames,
          canCreateTags: Boolean(canEditSettings),
        });
        tagIdByKey = res.tagIdByKey;
      }

      // 2. Batch insert in chunks of 100
      const chunkSize = 100;
      let importedCount = 0;
      let failedCount = 0;
      const tagAssignments: ContactTagAssignment[] = [];

      for (let i = 0; i < readyRows.length; i += chunkSize) {
        const chunk = readyRows.slice(i, i + chunkSize);
        const currentBatch = Math.min(i + chunkSize, readyRows.length);
        setImportProgress(Math.round((currentBatch / readyRows.length) * 100));
        setImportStatusText(`Importing contacts (${currentBatch} / ${readyRows.length})...`);

        const insertPayloads = chunk.map((r) => ({
          user_id: user.id,
          account_id: accountId,
          phone: r.normalizedResult.phone,
          name: r.name || null,
          email: r.email || null,
          company: r.company || null,
        }));

        const { data: inserted, error: batchErr } = await supabase
          .from('contacts')
          .insert(insertPayloads)
          .select('id');

        if (batchErr) {
          // Fallback: Retry individually so one unique violation doesn't sink the chunk
          for (let j = 0; j < chunk.length; j++) {
            const item = chunk[j];
            const singlePayload = {
              user_id: user.id,
              account_id: accountId,
              phone: item.normalizedResult.phone,
              name: item.name || null,
              email: item.email || null,
              company: item.company || null,
            };

            const { data: singleData, error: singleErr } = await supabase
              .from('contacts')
              .insert(singlePayload)
              .select('id')
              .maybeSingle();

            if (!singleErr && singleData) {
              importedCount++;
              if (item.tagNames.length > 0) {
                tagAssignments.push({
                  contactId: singleData.id,
                  tagNames: item.tagNames,
                });
              }
            } else if (isUniqueViolation(singleErr)) {
              // Safely treat duplicate as skipped
            } else {
              failedCount++;
              console.error('[ImportModal] Single contact insert failed:', item.normalizedResult.phone, singleErr);
            }
          }
        } else {
          const list = inserted ?? [];
          importedCount += list.length;
          for (let j = 0; j < list.length; j++) {
            const item = chunk[j];
            if (item && item.tagNames.length > 0) {
              tagAssignments.push({
                contactId: list[j].id,
                tagNames: item.tagNames,
              });
            }
          }
        }
      }

      // 3. Assign tags
      let tagsAssignedCount = 0;
      if (tagAssignments.length > 0) {
        setImportStatusText('Applying tags to imported contacts...');
        try {
          tagsAssignedCount = await assignImportedContactTags(
            supabase,
            tagAssignments,
            tagIdByKey
          );
        } catch (e) {
          console.warn('[ImportModal] Tag assignment warning:', e);
        }
      }

      setImportResult({
        imported: importedCount,
        tagsAssigned: tagsAssignedCount,
        skipped: kpis.existing + kpis.duplicate,
        failed: failedCount,
      });

      toast.success(`Successfully imported ${importedCount.toLocaleString()} contacts!`);
      onImported();
    } catch (err) {
      console.error('[ImportModal] Import failed:', err);
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,780px)] flex-col gap-0 overflow-hidden border-border/80 bg-popover p-0 text-popover-foreground sm:max-w-3xl">
        {/* Header with Step Progress */}
        <div className="shrink-0 border-b border-border/80 px-6 pt-5 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-semibold text-popover-foreground">
                {step === 4 && importResult ? 'Import Complete' : 'Smart Contact Import'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {step === 1 && 'Upload your spreadsheet or CSV file (supports .xlsx, .xls, .csv)'}
                {step === 2 && 'Verify smart column auto-detection and default country prefix'}
                {step === 3 && 'Inspect pre-import analytics, duplicates, and phone normalization'}
                {step === 4 && (importResult ? 'Your contacts have been processed' : 'Importing contacts into CRM...')}
              </DialogDescription>
            </div>
            {/* Step Indicators */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
              {[
                { n: 1, label: 'Upload' },
                { n: 2, label: 'Map' },
                { n: 3, label: 'Validate' },
                { n: 4, label: 'Import' },
              ].map(({ n, label }) => {
                const isActive = step === n;
                const isPassed = step > n;
                return (
                  <div key={n} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                        isActive && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                        isPassed && 'bg-primary/20 text-primary',
                        !isActive && !isPassed && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isPassed ? <Check className="size-3.5" /> : n}
                    </span>
                    <span className={cn('text-[11px]', isActive ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
                      {label}
                    </span>
                    {n < 4 && <span className="text-muted-foreground/40 mx-0.5">›</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {/* ========================================================================= */}
          {/* STEP 1: FILE UPLOAD */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
                className={cn(
                  'group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-all text-center',
                  parsingFile
                    ? 'border-primary/50 bg-primary/[0.03] pointer-events-none'
                    : 'border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/40'
                )}
              >
                {parsingFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-10 animate-spin text-primary" />
                    <p className="text-sm font-medium text-foreground">Analyzing file & extracting columns...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform group-hover:scale-105">
                      <FileSpreadsheet className="size-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        Click to upload or drag & drop spreadsheet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports <span className="font-semibold text-foreground">Excel (.xlsx, .xls)</span>, CSV, and TSV files
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 text-[11px] text-muted-foreground">
                      <span className="rounded-md bg-muted px-2 py-0.5">Auto-Detects 10-digit Indian numbers</span>
                      <span className="rounded-md bg-muted px-2 py-0.5">Deduplicates against CRM</span>
                    </div>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                className="hidden"
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: SMART COLUMN MAPPING */}
          {/* ========================================================================= */}
          {step === 2 && parsedData && (
            <div className="space-y-5">
              <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3 text-xs text-foreground/90 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-4 text-primary" />
                  <span className="font-medium">{file?.name}</span>
                  <span className="text-muted-foreground">({parsedData.totalRows.toLocaleString()} rows detected)</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Change file
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Column Matching & Normalization Rules
                </h4>

                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Phone Column (Required) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1">
                      Phone Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <select
                      value={columnMapping.phone || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, phone: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      Required for WhatsApp broadcasts.
                    </p>
                  </div>

                  {/* Default Country Code */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Default Country Prefix
                    </label>
                    <select
                      value={defaultCountryCode}
                      onChange={(e) => setDefaultCountryCode(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      Auto-prefixes numbers without country code (e.g. 98100XXXXX → +9198100XXXXX).
                    </p>
                  </div>

                  {/* Name Column */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Contact Name (Optional)
                    </label>
                    <select
                      value={columnMapping.name || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, name: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- None (Leave empty) --</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email Column */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Email Address (Optional)
                    </label>
                    <select
                      value={columnMapping.email || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, email: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- None (Leave empty) --</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Company Column */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Company / Organization (Optional)
                    </label>
                    <select
                      value={columnMapping.company || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, company: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- None (Leave empty) --</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Tags Column */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Tags (Optional)
                    </label>
                    <select
                      value={columnMapping.tags || ''}
                      onChange={(e) => setColumnMapping({ ...columnMapping, tags: e.target.value || null })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- None (Leave empty) --</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sample Live Row Preview */}
              {parsedData.rows.length > 0 && columnMapping.phone && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live Sample Preview (Row 1)
                  </h4>
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-1 font-mono">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24">Original:</span>
                      <span className="text-foreground">{parsedData.rows[0][columnMapping.phone] || '—'}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-24">Formatted:</span>
                      <span className="text-emerald-400 font-semibold">
                        {smartNormalizePhone(parsedData.rows[0][columnMapping.phone], defaultCountryCode).phone || 'Invalid'}
                      </span>
                    </div>
                    {columnMapping.name && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-24">Name:</span>
                        <span className="text-foreground">{parsedData.rows[0][columnMapping.name] || '—'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: SMART VALIDATION & KPI ANALYSIS */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-5">
              {validating ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm font-medium text-foreground">
                    Running smart phone normalizer & checking CRM duplicates...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cross-referencing database records for account safety.
                  </p>
                </div>
              ) : (
                <>
                  {/* Smart KPI Metric Cards */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {/* Ready */}
                    <div
                      onClick={() => setFilterTab('ready')}
                      className={cn(
                        'cursor-pointer rounded-xl border p-3 transition-all',
                        filterTab === 'ready'
                          ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                          : 'border-border/80 bg-background/50 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span>Ready to Import</span>
                      </div>
                      <p className="text-xl font-bold text-foreground mt-1">
                        {kpis.ready.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        New & valid contacts
                      </p>
                    </div>

                    {/* Existing in CRM */}
                    <div
                      onClick={() => setFilterTab('existing')}
                      className={cn(
                        'cursor-pointer rounded-xl border p-3 transition-all',
                        filterTab === 'existing'
                          ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/20'
                          : 'border-border/80 bg-background/50 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span>Already in CRM</span>
                      </div>
                      <p className="text-xl font-bold text-foreground mt-1">
                        {kpis.existing.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Skipped (no duplicates)
                      </p>
                    </div>

                    {/* File Duplicates */}
                    <div
                      onClick={() => setFilterTab('duplicate')}
                      className={cn(
                        'cursor-pointer rounded-xl border p-3 transition-all',
                        filterTab === 'duplicate'
                          ? 'border-orange-500/50 bg-orange-500/10 ring-1 ring-orange-500/20'
                          : 'border-border/80 bg-background/50 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-orange-400 text-xs font-medium">
                        <Copy className="size-3.5 shrink-0" />
                        <span>File Duplicates</span>
                      </div>
                      <p className="text-xl font-bold text-foreground mt-1">
                        {kpis.duplicate.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Repeat rows in sheet
                      </p>
                    </div>

                    {/* Invalid */}
                    <div
                      onClick={() => setFilterTab('invalid')}
                      className={cn(
                        'cursor-pointer rounded-xl border p-3 transition-all',
                        filterTab === 'invalid'
                          ? 'border-red-500/50 bg-red-500/10 ring-1 ring-red-500/20'
                          : 'border-border/80 bg-background/50 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                        <XCircle className="size-3.5 shrink-0" />
                        <span>Invalid Numbers</span>
                      </div>
                      <p className="text-xl font-bold text-foreground mt-1">
                        {kpis.invalid.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Malformed numbers
                      </p>
                    </div>
                  </div>

                  {/* Filter Toolbar & Actions */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
                      <Button
                        variant={filterTab === 'all' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterTab('all')}
                        className="h-6 text-[11px] px-2.5"
                      >
                        All ({kpis.total.toLocaleString()})
                      </Button>
                      <Button
                        variant={filterTab === 'ready' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterTab('ready')}
                        className="h-6 text-[11px] px-2.5 text-emerald-400 font-medium"
                      >
                        Ready ({kpis.ready.toLocaleString()})
                      </Button>
                      <Button
                        variant={filterTab === 'existing' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterTab('existing')}
                        className="h-6 text-[11px] px-2.5 text-amber-400 font-medium"
                      >
                        Existing ({kpis.existing.toLocaleString()})
                      </Button>
                      <Button
                        variant={filterTab === 'duplicate' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterTab('duplicate')}
                        className="h-6 text-[11px] px-2.5 text-orange-400 font-medium"
                      >
                        Duplicates ({kpis.duplicate.toLocaleString()})
                      </Button>
                      <Button
                        variant={filterTab === 'invalid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterTab('invalid')}
                        className="h-6 text-[11px] px-2.5 text-red-400 font-medium"
                      >
                        Invalid ({kpis.invalid.toLocaleString()})
                      </Button>
                    </div>

                    {kpis.existing + kpis.duplicate + kpis.invalid > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadSkipped}
                        className="h-7 text-xs border-border gap-1.5"
                      >
                        <Download className="size-3.5" />
                        Download Skipped CSV
                      </Button>
                    )}
                  </div>

                  {/* Interactive Table Preview */}
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="max-h-[280px] overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-muted border-b border-border z-10">
                          <tr>
                            <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                            <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Phone (Clean)</th>
                            <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Original Value</th>
                            <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Name</th>
                            <th className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">Diagnostic Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 bg-background/50">
                          {displayedRows.slice(0, 50).map((row) => (
                            <tr key={row.index} className="hover:bg-muted/30 transition-colors">
                              <td className="px-3 py-1.5 whitespace-nowrap">
                                {row.status === 'ready' && (
                                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                                    Ready
                                  </Badge>
                                )}
                                {row.status === 'existing' && (
                                  <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                                    In CRM
                                  </Badge>
                                )}
                                {row.status === 'duplicate' && (
                                  <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px]">
                                    Duplicate
                                  </Badge>
                                )}
                                {row.status === 'invalid' && (
                                  <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
                                    Invalid
                                  </Badge>
                                )}
                              </td>
                              <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap text-foreground font-medium">
                                {row.normalizedResult.phone || '—'}
                              </td>
                              <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                                {row.originalPhone || '—'}
                              </td>
                              <td className="px-3 py-1.5 truncate max-w-[120px] text-foreground">
                                {row.name || '—'}
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground text-[11px]">
                                {row.reason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {displayedRows.length > 50 && (
                    <p className="text-center text-[11px] text-muted-foreground">
                      Showing first 50 of {displayedRows.length.toLocaleString()} records in this view
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: IMPORT EXECUTION & FINAL REPORT */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-6 py-6">
              {importing ? (
                <div className="space-y-4 text-center max-w-md mx-auto">
                  <Loader2 className="size-10 animate-spin text-primary mx-auto" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">{importStatusText}</p>
                    <p className="text-xs text-muted-foreground">Please keep this window open while contacts are added.</p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{importProgress}%</p>
                </div>
              ) : importResult ? (
                <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                  <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center ring-4 ring-emerald-500/20">
                    <CheckCircle2 className="size-9" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">
                      Contacts Imported Successfully!
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Your CRM contact database has been updated with clean, E.164-normalized numbers.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full pt-2">
                    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Imported</p>
                      <p className="text-lg font-bold text-emerald-400 mt-0.5">
                        {importResult.imported.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Tags</p>
                      <p className="text-lg font-bold text-cyan-400 mt-0.5">
                        {importResult.tagsAssigned.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <p className="text-xs text-muted-foreground">Skipped</p>
                      <p className="text-lg font-bold text-amber-400 mt-0.5">
                        {importResult.skipped.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {kpis.existing + kpis.duplicate + kpis.invalid > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSkipped}
                      className="text-xs border-border gap-1.5 mt-2"
                    >
                      <Download className="size-3.5" />
                      Download Skipped / Invalid Contacts (CSV)
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <DialogFooter className="border-t border-border/80 bg-background/50 px-6 py-3.5 flex items-center justify-between sm:justify-between">
          <div>
            {step === 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs text-muted-foreground gap-1.5"
              >
                <ArrowLeft className="size-3.5" /> Back to Upload
              </Button>
            )}
            {step === 3 && !validating && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(2)}
                className="text-xs text-muted-foreground gap-1.5"
              >
                <ArrowLeft className="size-3.5" /> Back to Mapping
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                className="text-xs border-border text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                size="sm"
                disabled={!columnMapping.phone}
                onClick={runValidation}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5"
              >
                Next: Review & Validate <ArrowRight className="size-3.5" />
              </Button>
            )}

            {step === 3 && (
              <Button
                type="button"
                size="sm"
                disabled={kpis.ready === 0 || validating}
                onClick={handleExecuteImport}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
              >
                Confirm & Import {kpis.ready > 0 && `(${kpis.ready.toLocaleString()})`}
              </Button>
            )}

            {step === 4 && importResult && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenChange(false)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
              >
                Done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
