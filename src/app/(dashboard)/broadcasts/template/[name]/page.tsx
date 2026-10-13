'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Loader2,
  Users,
  Send,
  CheckCheck,
  Eye,
  AlertCircle,
  MessageCircle,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  ExternalLink,
  ShieldAlert,
  FileText,
  Clock,
  Sparkles,
  Store,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

interface TemplateDossier {
  template: {
    name: string;
    category: string;
    language: string;
    status: string;
    body_text?: string;
    footer_text?: string;
    buttons?: Array<{ type: string; text: string }>;
    header_type?: string;
    header_content?: string;
  };
  stats: {
    total_unique_contacts: number;
    net_sent: number;
    net_delivered: number;
    net_read: number;
    net_replied: number;
    net_failed: number;
    gross_recipients: number;
    gross_delivered: number;
    gross_read: number;
    gross_failed: number;
    campaigns_count: number;
  };
  error_diagnostics: {
    undeliverable: number;
    ecosystem: number;
    rate_limit: number;
    service_window: number;
    other: number;
  };
  campaign_runs: Array<{
    id: string;
    name: string;
    status: string;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    read_count: number;
    failed_count: number;
    paused_count: number;
    created_at: string;
    is_retry: boolean;
    retry_of_broadcast_id: string | null;
  }>;
  tags?: Array<{ id: string; name: string; color: string }>;
  store_breakdown?: Array<{
    tag_id: string;
    tag_name: string;
    color: string;
    targeted: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
}

interface RecipientItem {
  contact_id: string;
  name: string;
  phone: string;
  avatar_url?: string | null;
  net_status: 'read' | 'delivered' | 'sent' | 'replied' | 'failed' | 'paused';
  attempts_count: number;
  last_error_message?: string | null;
  last_attempt_at: string;
  tags?: Array<{ id: string; name: string; color: string }>;
}

function StatCard({
  label,
  value,
  total,
  icon,
  color,
  sublabel,
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  color: string;
  sublabel?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4 shadow-sm transition hover:border-primary/30">
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <p className="mt-2.5 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sublabel && (
        <p className="mt-0.5 text-[10px] text-muted-foreground/80">{sublabel}</p>
      )}
    </div>
  );
}

function FunnelStepRow({
  label,
  value,
  max,
  color,
  ofTotal,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  ofTotal: number;
}) {
  const pctOfMax = Math.max(5, Math.round((value / max) * 100));
  const pctOfTotal = ofTotal > 0 ? Math.round((value / ofTotal) * 100) : 0;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="w-16 sm:w-20 shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="relative h-7 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-7 rounded-full ${color} transition-[width] duration-500`}
          style={{ width: `${pctOfMax}%` }}
        />
        <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-foreground">
          {value.toLocaleString()}
          <span className="ml-1.5 font-normal text-muted-foreground">
            ({pctOfTotal}%)
          </span>
        </span>
      </div>
    </div>
  );
}

function toCsv(rows: string[][]): string {
  const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
  return rows.map((r) => r.map(escape).join(',')).join('\n');
}

function downloadBlob(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function TemplateReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateName = decodeURIComponent((params.name as string) || '');

  const [dossier, setDossier] = useState<TemplateDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recipients pagination & filters
  const [recipients, setRecipients] = useState<RecipientItem[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'read' | 'failed'>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecipients, setTotalRecipients] = useState(0);

  // Actions state
  const [retrying, setRetrying] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch Template Dossier
  const fetchDossier = useCallback(async () => {
    if (!templateName) return;
    try {
      const res = await fetch(
        `/api/whatsapp/broadcasts/template-reports/${encodeURIComponent(templateName)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load template dossier');
      setDossier(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [templateName]);

  // Fetch Paginated Recipients
  const fetchRecipients = useCallback(async () => {
    if (!templateName) return;
    setRecipientsLoading(true);
    try {
      const url = new URL(
        `/api/whatsapp/broadcasts/template-reports/${encodeURIComponent(templateName)}/recipients`,
        window.location.origin
      );
      url.searchParams.set('page', page.toString());
      url.searchParams.set('pageSize', '30');
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
      if (storeFilter !== 'all') url.searchParams.set('tagId', storeFilter);
      if (debouncedSearch) url.searchParams.set('search', debouncedSearch);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load recipients');

      setRecipients(data.recipients ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalRecipients(data.total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error fetching contacts');
    } finally {
      setRecipientsLoading(false);
    }
  }, [templateName, page, statusFilter, storeFilter, debouncedSearch]);

  useEffect(() => {
    fetchDossier();
  }, [fetchDossier]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  // Consolidated Retry Trigger
  async function handleConsolidatedRetry() {
    if (!templateName) return;
    setRetrying(true);
    const toastId = toast.loading('Creating consolidated retry campaign for net-failed contacts...');
    try {
      const res = await fetch(
        `/api/whatsapp/broadcasts/template-reports/${encodeURIComponent(templateName)}/retry`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create retry campaign');

      toast.dismiss(toastId);
      toast.success(
        `Consolidated retry started with ${data.recipient_count} recipients! Opening live dashboard...`
      );
      router.push(`/broadcasts/${data.retry_broadcast_id}`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : 'Failed to start retry campaign');
    } finally {
      setRetrying(false);
    }
  }

  // Export Full CSV
  async function handleExportCsv() {
    if (!templateName) return;
    setExporting(true);
    const toastId = toast.loading('Preparing full audience report CSV...');
    try {
      const url = new URL(
        `/api/whatsapp/broadcasts/template-reports/${encodeURIComponent(templateName)}/recipients`,
        window.location.origin
      );
      url.searchParams.set('page', '1');
      url.searchParams.set('pageSize', '10000');
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
      if (storeFilter !== 'all') url.searchParams.set('tagId', storeFilter);
      if (debouncedSearch) url.searchParams.set('search', debouncedSearch);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to export');

      const headers = ['Contact Name', 'Phone Number', 'Net Status', 'Runs Attempted', 'Stores / Tags', 'Last Attempt Date', 'Last Failure Reason'];
      const rows = (data.recipients ?? []).map((r: RecipientItem) => [
        r.name,
        r.phone,
        r.net_status,
        r.attempts_count.toString(),
        (r.tags ?? []).map((t) => t.name).join('; '),
        new Date(r.last_attempt_at).toLocaleString(),
        r.last_error_message || '',
      ]);

      const csv = toCsv([headers, ...rows]);
      downloadBlob(`${templateName}-net-report.csv`, csv);
      toast.dismiss(toastId);
      toast.success('Audience report exported successfully');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Aggregating template performance...</p>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-400">{error || 'Template not found'}</p>
        <Button variant="outline" onClick={() => router.push('/broadcasts?view=templates')}>
          Back to Broadcasts
        </Button>
      </div>
    );
  }

  const { template, stats, error_diagnostics, campaign_runs, store_breakdown, tags } = dossier;
  const maxFunnel = Math.max(stats.total_unique_contacts, 1);
  const storeTags = (tags ?? []).filter((t) => t.name.toLowerCase().startsWith('store:'));

  return (
    <div className="space-y-5 sm:space-y-6 pb-12">
      {/* Mobile-First Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/broadcasts?view=templates')}
            className="h-9 w-9 shrink-0 border-border"
            aria-label="Back to templates"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                {template.name}
              </h1>
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {template.category}
              </span>
              <span className="inline-flex items-center rounded-full border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-400">
                {template.status}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {template.language}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {campaign_runs.length} {campaign_runs.length === 1 ? 'Campaign' : 'Campaigns / Retries'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex-1 sm:flex-none border-border h-9 text-xs"
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Export CSV
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  size="sm"
                  disabled={retrying || stats.net_failed === 0}
                  className="flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs"
                />
              }
            >
              {retrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Consolidated Retry
              <ChevronDown className="h-3 w-3 ml-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="border-border bg-popover min-w-[240px]">
              <DropdownMenuItem
                disabled={stats.net_failed === 0}
                onClick={handleConsolidatedRetry}
                className="cursor-pointer gap-2 py-2"
              >
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-foreground">
                    Retry Net Failed ({stats.net_failed.toLocaleString()})
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Clean de-duplicated retry skipping already delivered contacts
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Outstanding Failures Alert Banner */}
      {stats.net_failed > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold text-foreground">
                {stats.net_failed.toLocaleString()} unique contacts remain permanently failed
              </p>
              <p className="text-muted-foreground">
                These contacts failed in all campaign runs. You can launch a consolidated retry or inspect the failure codes below.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleConsolidatedRetry}
            disabled={retrying}
            className="w-full sm:w-auto h-8 bg-red-600 text-white hover:bg-red-700 shrink-0 text-xs"
          >
            {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RotateCcw className="h-3.5 w-3.5 mr-1" />}
            Retry {stats.net_failed.toLocaleString()} Contacts
          </Button>
        </div>
      )}

      {/* 7 StatCards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        <StatCard
          label="Unique Audience"
          value={stats.total_unique_contacts}
          total={stats.total_unique_contacts}
          icon={<Users className="h-4 w-4" />}
          color="bg-muted text-muted-foreground"
          sublabel="De-duplicated contacts"
        />
        <StatCard
          label="Net Sent"
          value={stats.net_sent}
          total={stats.total_unique_contacts}
          icon={<Send className="h-4 w-4" />}
          color="bg-primary/10 text-primary"
          sublabel="Dispatched to Meta"
        />
        <StatCard
          label="Net Delivered"
          value={stats.net_delivered}
          total={stats.total_unique_contacts}
          icon={<CheckCheck className="h-4 w-4" />}
          color="bg-teal-500/10 text-teal-400"
          sublabel="Received on devices"
        />
        <StatCard
          label="Net Read"
          value={stats.net_read}
          total={stats.total_unique_contacts}
          icon={<Eye className="h-4 w-4" />}
          color="bg-blue-500/10 text-blue-400"
          sublabel="Blue double ticks"
        />
        <StatCard
          label="Net Replied"
          value={stats.net_replied}
          total={stats.total_unique_contacts}
          icon={<MessageCircle className="h-4 w-4" />}
          color="bg-indigo-500/10 text-indigo-400"
          sublabel="Customer responded"
        />
        <StatCard
          label="Net Failed"
          value={stats.net_failed}
          total={stats.total_unique_contacts}
          icon={<AlertCircle className="h-4 w-4" />}
          color="bg-red-500/10 text-red-400"
          sublabel="Unreachable in all runs"
        />
        <StatCard
          label="Gross Attempts"
          value={stats.gross_recipients}
          total={stats.gross_recipients}
          icon={<RotateCcw className="h-4 w-4" />}
          color="bg-amber-500/10 text-amber-400"
          sublabel={`${campaign_runs.length} total runs volume`}
        />
      </div>

      {/* Physical Store Performance Breakdown Card */}
      {store_breakdown && store_breakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" />
              Store-Wise Delivery Performance
            </h3>
            <span className="text-xs text-muted-foreground">
              Click any store to filter recipient table below
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {store_breakdown.map((s) => {
              const deliveryPct = s.targeted > 0 ? Math.round((s.delivered / s.targeted) * 100) : 0;
              const isSelected = storeFilter === s.tag_id;

              return (
                <div
                  key={s.tag_id}
                  onClick={() => {
                    setStoreFilter(isSelected ? 'all' : s.tag_id);
                    setPage(1);
                  }}
                  className={`rounded-lg border p-3 cursor-pointer transition text-xs space-y-1.5 ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border/80 bg-background/50 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      style={{ color: s.color }}
                      className="font-bold flex items-center gap-1.5 truncate"
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.tag_name}
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      {deliveryPct}% delivery
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground">
                    <div>Target: <strong className="text-foreground">{s.targeted.toLocaleString()}</strong></div>
                    <div>Delivered: <strong className="text-teal-400">{s.delivered.toLocaleString()}</strong></div>
                    <div>Failed: <strong className="text-red-400">{s.failed.toLocaleString()}</strong></div>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${deliveryPct}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Funnel Chart & Diagnostics Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Funnel Card */}
        <div className="rounded-xl border border-border bg-card p-4 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Net Conversion Funnel (De-duplicated)
            </h3>
            <span className="text-xs text-muted-foreground">
              {stats.total_unique_contacts.toLocaleString()} Total Contacts
            </span>
          </div>

          <div className="space-y-2.5">
            <FunnelStepRow
              label="Targeted"
              value={stats.total_unique_contacts}
              max={maxFunnel}
              color="bg-muted-foreground/30"
              ofTotal={stats.total_unique_contacts}
            />
            <FunnelStepRow
              label="Sent"
              value={stats.net_sent}
              max={maxFunnel}
              color="bg-primary"
              ofTotal={stats.total_unique_contacts}
            />
            <FunnelStepRow
              label="Delivered"
              value={stats.net_delivered}
              max={maxFunnel}
              color="bg-teal-500"
              ofTotal={stats.total_unique_contacts}
            />
            <FunnelStepRow
              label="Read"
              value={stats.net_read}
              max={maxFunnel}
              color="bg-blue-500"
              ofTotal={stats.total_unique_contacts}
            />
            <FunnelStepRow
              label="Replied"
              value={stats.net_replied}
              max={maxFunnel}
              color="bg-indigo-500"
              ofTotal={stats.total_unique_contacts}
            />
          </div>
        </div>

        {/* Failure Diagnostics Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Meta Failure Root Causes
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                <div>
                  <p className="font-semibold text-foreground">Code 131026: Undeliverable</p>
                  <p className="text-[11px] text-muted-foreground">Phone number not active on WhatsApp</p>
                </div>
                <span className="font-bold tabular-nums text-red-400">
                  {error_diagnostics.undeliverable.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                <div>
                  <p className="font-semibold text-foreground">Code 131049: Marketing Cap</p>
                  <p className="text-[11px] text-muted-foreground">Meta 24h user frequency protection</p>
                </div>
                <span className="font-bold tabular-nums text-amber-400">
                  {error_diagnostics.ecosystem.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                <div>
                  <p className="font-semibold text-foreground">Code 130429: Cloud Rate Limit</p>
                  <p className="text-[11px] text-muted-foreground">Account tier messages/sec ceiling</p>
                </div>
                <span className="font-bold tabular-nums text-blue-400">
                  {error_diagnostics.rate_limit.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                <div>
                  <p className="font-semibold text-foreground">Other / Network Errors</p>
                  <p className="text-[11px] text-muted-foreground">Temporary connection issues</p>
                </div>
                <span className="font-bold tabular-nums text-muted-foreground">
                  {(error_diagnostics.other + error_diagnostics.service_window).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-muted-foreground border-t border-border mt-3">
            💡 <em>Tip: Undeliverable numbers should be blacklisted, while Marketing Cap numbers succeed when retried next day.</em>
          </div>
        </div>
      </div>

      {/* Campaign Runs Timeline & Retries Chain Card */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Campaign Runs & Retries Chain ({campaign_runs.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            All campaigns launched using this template
          </span>
        </div>

        {/* Mobile touch cards for runs */}
        <div className="flex flex-col gap-2.5 sm:hidden">
          {campaign_runs.map((run, idx) => (
            <div
              key={run.id}
              onClick={() => router.push(`/broadcasts/${run.id}`)}
              className="rounded-lg border border-border bg-background/60 p-3 text-xs space-y-2 transition active:bg-muted/50 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground truncate pr-2">
                  {idx === 0 ? 'Run 1 (Initial)' : `Run ${idx + 1} (Retry)`}: {run.name}
                </span>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] capitalize bg-muted text-muted-foreground shrink-0">
                  {run.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded">
                <div>Targeted: <strong className="text-foreground">{run.total_recipients}</strong></div>
                <div>Delivered: <strong className="text-teal-400">{run.delivered_count}</strong></div>
                <div>Failed: <strong className="text-red-400">{run.failed_count}</strong></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                <span>{new Date(run.created_at).toLocaleString()}</span>
                <span className="text-primary flex items-center gap-1 font-medium">
                  View Run Report <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table for runs */}
        <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Run & Campaign Name</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Targeted</th>
                <th className="py-2.5 px-3 text-right">Delivered</th>
                <th className="py-2.5 px-3 text-right">Failed</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaign_runs.map((run, idx) => (
                <tr key={run.id} className="hover:bg-muted/30 transition">
                  <td className="py-2.5 px-3 font-medium text-foreground">
                    <span className="mr-2 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {idx === 0 ? 'Initial' : `Retry #${idx}`}
                    </span>
                    {run.name}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] capitalize bg-muted text-muted-foreground">
                      {run.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-foreground">{run.total_recipients.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-teal-400 font-medium">{run.delivered_count.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-red-400 font-medium">{run.failed_count.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{new Date(run.created_at).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/broadcasts/${run.id}`)}
                      className="h-7 text-xs text-primary hover:text-primary/90"
                    >
                      Report <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Contact-Level Recipients Table */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Audience Net Outcomes ({totalRecipients.toLocaleString()})
            </h3>
            <p className="text-xs text-muted-foreground">
              De-duplicated contact status resolving outcomes across all retry runs
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs border-border bg-background"
              />
            </div>

            {/* Store Tag Filter Dropdown */}
            {storeTags.length > 0 && (
              <div className="flex items-center">
                <select
                  value={storeFilter}
                  onChange={(e) => {
                    setStoreFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">🏬 All Stores</option>
                  {storeTags.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center rounded-lg bg-muted p-0.5 text-xs">
              {(['all', 'delivered', 'read', 'failed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs capitalize transition ${
                    statusFilter === st
                      ? 'bg-background font-semibold text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Export Filtered CSV Button directly in toolbar */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={exporting}
              className="h-8 text-xs border-border bg-background hover:bg-muted font-medium text-foreground shrink-0 shadow-xs"
              title="Export contacts matching current store and status filters"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5 text-primary" />
              )}
              Export CSV
            </Button>

            {/* Reset Filters button if any filter is active */}
            {(storeFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStoreFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                  setPage(1);
                }}
                className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {recipientsLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : recipients.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs font-medium text-foreground">No matching contacts found</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Try adjusting your search query, store filter, or status tab.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Contact Cards (sm:hidden) */}
            <div className="flex flex-col gap-2.5 sm:hidden">
              {recipients.map((r) => {
                const statusColor =
                  r.net_status === 'read'
                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    : r.net_status === 'delivered'
                    ? 'border-teal-500/30 bg-teal-500/10 text-teal-400'
                    : 'border-red-500/30 bg-red-500/10 text-red-400';

                return (
                  <div
                    key={r.contact_id}
                    className="rounded-lg border border-border bg-background/50 p-3 text-xs space-y-2 transition active:bg-muted/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate pr-2">
                        {r.name}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColor}`}>
                        {r.net_status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{r.phone}</span>
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground">
                        {r.attempts_count} {r.attempts_count === 1 ? 'attempt' : 'attempts'}
                      </span>
                    </div>

                    {/* Store Badges on Mobile */}
                    {r.tags && r.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {r.tags.map((t) => (
                          <span
                            key={t.id}
                            style={{
                              backgroundColor: `${t.color}15`,
                              borderColor: `${t.color}40`,
                              color: t.color,
                            }}
                            className="inline-flex rounded border px-1.5 py-0.2 text-[9px] font-bold"
                          >
                            {t.name.replace(/^Store:\s*/i, '')}
                          </span>
                        ))}
                      </div>
                    )}

                    {r.last_error_message && (
                      <p className="text-[10px] text-red-400/90 bg-red-500/5 p-1.5 rounded border border-red-500/15 break-words">
                        {r.last_error_message}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground border-t border-border/50">
                      <span>Last run: {new Date(r.last_attempt_at).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() => router.push(`/inbox?contactId=${r.contact_id}`)}
                        className="text-primary hover:underline font-medium"
                      >
                        Open Chat →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Store(s)</th>
                    <th className="py-2.5 px-3">Net Status</th>
                    <th className="py-2.5 px-3 text-center">Attempts</th>
                    <th className="py-2.5 px-3">Last Attempt Date</th>
                    <th className="py-2.5 px-3">Diagnostic Note</th>
                    <th className="py-2.5 px-3 text-right">Chat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recipients.map((r) => {
                    const statusColor =
                      r.net_status === 'read'
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                        : r.net_status === 'delivered'
                        ? 'border-teal-500/30 bg-teal-500/10 text-teal-400'
                        : 'border-red-500/30 bg-red-500/10 text-red-400';

                    return (
                      <tr key={r.contact_id} className="hover:bg-muted/30 transition">
                        <td className="py-2.5 px-3 font-semibold text-foreground">{r.name}</td>
                        <td className="py-2.5 px-3 text-muted-foreground tabular-nums">{r.phone}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap items-center gap-1">
                            {(r.tags ?? []).map((t) => (
                              <span
                                key={t.id}
                                style={{
                                  backgroundColor: `${t.color}15`,
                                  borderColor: `${t.color}40`,
                                  color: t.color,
                                }}
                                className="inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold"
                              >
                                {t.name.replace(/^Store:\s*/i, '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColor}`}>
                            {r.net_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums text-muted-foreground">
                          {r.attempts_count}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {new Date(r.last_attempt_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-[11px] text-muted-foreground" title={r.last_error_message || ''}>
                          {r.last_error_message || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/inbox?contactId=${r.contact_id}`)}
                            className="h-7 text-xs text-primary"
                          >
                            Chat
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <span>Page {page} of {totalPages}</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 border-border"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 border-border"
                  >
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
