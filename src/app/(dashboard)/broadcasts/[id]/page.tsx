'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Broadcast, BroadcastRecipient, RecipientStatus } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Filter,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  PlayCircle,
  RotateCcw,
  Pause,
  PauseCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  getBroadcastStatus,
  getRecipientStatus,
  isPausedRecipient,
} from '@/lib/broadcast-status';
import { useTranslations } from 'next-intl';

interface StatCardProps {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ label, value, total, icon, color }: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

/**
 * Pure-CSS funnel chart: decreasing-width rounded bars.
 * Width is relative to the largest step (typically Sent) so we
 * always render a full bar at the top and proportional tails.
 */
function FunnelChart({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-medium text-foreground">Funnel</h3>
      <div className="space-y-2">
        {steps.map((step) => {
          const pctOfMax = Math.max(5, Math.round((step.value / max) * 100));
          const pctOfSent =
            steps[0].value > 0
              ? Math.round((step.value / steps[0].value) * 100)
              : 0;
          return (
            <div key={step.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-muted-foreground">
                {step.label}
              </span>
              <div className="relative h-7 flex-1 rounded-full bg-muted">
                <div
                  className={`h-7 rounded-full ${step.color} transition-[width] duration-500`}
                  style={{ width: `${pctOfMax}%` }}
                />
                <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-foreground">
                  {step.value.toLocaleString()}
                  <span className="ml-2 text-muted-foreground/80">
                    ({pctOfSent}%)
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const RECIPIENT_STATUSES: readonly RecipientStatus[] = [
  'pending',
  'sent',
  'delivered',
  'read',
  'replied',
  'failed',
  'paused',
];

/**
 * CSV export helper — RFC 4180 quoting. Quote every field so
 * commas/newlines/quotes round-trip cleanly.
 */
function toCsv(rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
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

export default function BroadcastDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('Broadcasts.detail');
  const tStatus = useTranslations('Broadcasts.status');
  const broadcastId = params.id as string;

  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [recipients, setRecipients] = useState<BroadcastRecipient[]>([]);
  const [counts, setCounts] = useState<{
    pending: number;
    paused: number;
    failed: number;
  }>({ pending: 0, paused: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RecipientStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'status' | 'sent_at' | 'delivered_at' | 'read_at' | 'error_message'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [totalFilteredRecipients, setTotalFilteredRecipients] = useState(0);
  const [childRetries, setChildRetries] = useState<{
    id: string;
    name: string;
    status: string;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    created_at: string;
  }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resumingScope, setResumingScope] = useState<
    'pending' | 'failed' | 'paused' | null
  >(null);
  const [pausing, setPausing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();

      const { data: bc, error: bcError } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('id', broadcastId)
        .single();

      if (bcError) throw bcError;
      setBroadcast(bc);

      // Fetch linked child retries
      const { data: retries } = await supabase
        .from('broadcasts')
        .select('id, name, status, total_recipients, sent_count, delivered_count, created_at')
        .contains('audience_filter', { retry_of_broadcast_id: broadcastId });
      setChildRetries(retries ?? []);

      // 1. Fetch exact aggregate counts from the database via head: true (zero row payload, exact)
      const [
        { count: pausedExact },
        { count: pendingExact },
        { count: failedExact },
      ] = await Promise.all([
        supabase
          .from('broadcast_recipients')
          .select('id', { count: 'exact', head: true })
          .eq('broadcast_id', broadcastId)
          .eq('status', 'paused'),
        supabase
          .from('broadcast_recipients')
          .select('id', { count: 'exact', head: true })
          .eq('broadcast_id', broadcastId)
          .eq('status', 'pending'),
        supabase
          .from('broadcast_recipients')
          .select('id', { count: 'exact', head: true })
          .eq('broadcast_id', broadcastId)
          .eq('status', 'failed'),
      ]);

      // If the broadcast is paused, any remaining pending recipients are part of the paused campaign!
      if (bc.status === 'paused' && (pendingExact ?? 0) > 0) {
        supabase
          .from('broadcast_recipients')
          .update({
            status: 'paused',
            error_message: 'Campaign paused',
          })
          .eq('broadcast_id', broadcastId)
          .eq('status', 'pending')
          .then(() => {});
      }

      // Compute true counts:
      // When a campaign is in 'paused' status, all unsent recipients (total - sent - failed) are paused.
      const rawPaused = (pausedExact ?? 0) + (bc.status === 'paused' ? (pendingExact ?? 0) : 0);
      const computedUnsentPaused =
        bc.status === 'paused'
          ? Math.max(0, (bc.total_recipients ?? 0) - (bc.sent_count ?? 0) - (failedExact ?? bc.failed_count ?? 0))
          : 0;
      const truePaused = Math.max(
        bc.paused_count ?? 0,
        rawPaused,
        computedUnsentPaused
      );
      const truePending = bc.status === 'paused' ? 0 : (pendingExact ?? 0);
      const trueFailed = failedExact ?? bc.failed_count ?? 0;

      setCounts({
        paused: truePaused,
        pending: truePending,
        failed: trueFailed,
      });

      // 2. Fetch rows for the table matching statusFilter, search, sort, and pagination
      let recQuery = supabase
        .from('broadcast_recipients')
        .select('*, contact:contacts(*)', { count: 'exact' })
        .eq('broadcast_id', broadcastId);

      if (statusFilter === 'paused') {
        recQuery = recQuery.in('status', ['paused', 'pending']);
      } else if (statusFilter === 'sent') {
        recQuery = recQuery.in('status', ['sent', 'delivered', 'read', 'replied']);
      } else if (statusFilter === 'delivered') {
        recQuery = recQuery.in('status', ['delivered', 'read', 'replied']);
      } else if (statusFilter === 'read') {
        recQuery = recQuery.in('status', ['read', 'replied']);
      } else if (statusFilter !== 'all') {
        recQuery = recQuery.eq('status', statusFilter);
      }

      if (debouncedSearch.trim()) {
        const { data: matchedContacts } = await supabase
          .from('contacts')
          .select('id')
          .or(`phone.ilike.%${debouncedSearch.trim()}%,name.ilike.%${debouncedSearch.trim()}%`)
          .limit(500);
        const cids = (matchedContacts ?? []).map((c) => c.id);
        if (cids.length > 0) {
          recQuery = recQuery.in('contact_id', cids);
        } else {
          recQuery = recQuery.in('contact_id', ['00000000-0000-0000-0000-000000000000']);
        }
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      recQuery = recQuery
        .order(sortField, { ascending: sortOrder === 'asc', nullsFirst: false })
        .range(from, to);

      const { data: recs, count: filteredCount, error: recsError } = await recQuery;

      if (recsError) throw recsError;
      setRecipients(recs ?? []);
      setTotalFilteredRecipients(filteredCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notFound'));
    } finally {
      setLoading(false);
    }
  }, [broadcastId, t, statusFilter, debouncedSearch, sortField, sortOrder, page]);

  useEffect(() => {
    fetchData();

    if (broadcast?.status === 'sending') {
      const interval = setInterval(() => {
        fetchData();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [fetchData, broadcast?.status]);

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  }

  function renderSortIcon(field: typeof sortField) {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 inline h-3 w-3 text-muted-foreground/40" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 inline h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3 text-primary" />
    );
  }

  async function handleRetryCampaign(scope: 'paused' | 'failed') {
    setResumingScope(scope);
    const toastId = toast.loading(`Creating dedicated ${scope} retry campaign...`);
    try {
      const res = await fetch(`/api/whatsapp/broadcast/${broadcastId}/retry-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create retry campaign');
      }

      toast.dismiss(toastId);
      toast.success(
        `Retry campaign created with ${data.recipient_count} recipients! Opening analytics...`
      );
      router.push(`/broadcasts/${data.retry_broadcast_id}`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : 'Failed to create retry campaign');
    } finally {
      setResumingScope(null);
    }
  }

  async function handleExport() {
    if (!broadcast) return;
    setExporting(true);
    const toastId = toast.loading('Preparing CSV export...');
    try {
      const supabase = createClient();
      const allRows: BroadcastRecipient[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('broadcast_recipients')
          .select('*, contact:contacts(*)')
          .eq('broadcast_id', broadcastId);

        if (statusFilter === 'paused') {
          query = query.in('status', ['paused', 'pending']);
        } else if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, error } = await query
          .range(from, from + PAGE_SIZE - 1)
          .order('created_at', { ascending: true });

        if (error || !data || data.length === 0) {
          hasMore = false;
          break;
        }

        allRows.push(...data);
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        } else {
          from += PAGE_SIZE;
        }
      }

      const header = [
        t('table.contact'),
        t('table.phone'),
        t('table.status'),
        t('table.sent'),
        t('table.delivered'),
        t('table.read'),
        t('table.error'),
      ];
      const rows = allRows.map((r) => [
        r.contact?.name ?? '',
        r.contact?.phone ?? '',
        isPausedRecipient(r) || (broadcast.status === 'paused' && r.status === 'pending')
          ? 'paused'
          : r.status,
        r.sent_at ?? '',
        r.delivered_at ?? '',
        r.read_at ?? '',
        r.error_message ?? '',
      ]);
      const csv = toCsv([header, ...rows]);
      const safeName = broadcast.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
      downloadBlob(`broadcast-${safeName}-${broadcastId.slice(0, 8)}.csv`, csv);
      toast.dismiss(toastId);
      toast.success(`Exported ${allRows.length} recipients`);
    } catch {
      toast.dismiss(toastId);
      toast.error('Failed to export recipients');
    } finally {
      setExporting(false);
    }
  }

  /**
   * Hand the leftovers to the server (issue #472).
   *
   * The wizard's send loop lives in the tab that started the campaign,
   * so navigating away strands the rest as 'pending' with the broadcast
   * stuck 'sending'. This is the recovery, and the same call retries
   * failed or paused recipients.
   */
  async function handleResume(scope: 'pending' | 'failed' | 'paused') {
    setResumingScope(scope);
    try {
      const res = await fetch(`/api/whatsapp/broadcast/${broadcastId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(
          t('toastResumeFailed', {
            error: payload?.error || `HTTP ${res.status}`,
          }),
        );
        return;
      }

      if (payload.deduplicated > 0) {
        toast.info(
          `${payload.deduplicated} contacts already received this template in other campaigns and were marked as sent.`
        );
      }

      toast.success(
        payload.remaining > 0
          ? t('toastResumeStartedCapped', {
              count: payload.resuming,
              remaining: payload.remaining,
            })
          : t('toastResumeStarted', { count: payload.resuming }),
      );
      // Delivery runs server-side after the 202, so the counts here are
      // a snapshot — reload to pick up the first of it.
      await fetchData();
    } catch (err) {
      toast.error(
        t('toastResumeFailed', {
          error: err instanceof Error ? err.message : 'Unknown error',
        }),
      );
    } finally {
      setResumingScope(null);
    }
  }

  async function handlePause() {
    setPausing(true);
    try {
      const res = await fetch(`/api/whatsapp/broadcast/${broadcastId}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(payload?.error || t('toastPauseFailed'));
        return;
      }

      toast.success(t('toastPaused'));
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to pause campaign');
    } finally {
      setPausing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createClient();
    // broadcast_recipients cascades on broadcasts.id (migration 001), so a
    // single delete is sufficient — the aggregate trigger in migration 003
    // is defined on broadcast_recipients but fires only on its own row
    // changes, not on a cascaded drop of the parent row.
    const { error: delErr } = await supabase
      .from('broadcasts')
      .delete()
      .eq('id', broadcastId);
    setDeleting(false);
    if (delErr) {
      toast.error(t('toastFailedDelete', { error: delErr.message }));
      return;
    }
    toast.success(t('toastDeleted'));
    router.push('/broadcasts');
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !broadcast) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error ?? t('notFound')}</p>
        <Button variant="outline" onClick={() => router.push('/broadcasts')}>
          {t('backToBroadcasts')}
        </Button>
      </div>
    );
  }

  const status = getBroadcastStatus(broadcast.status);

  const pendingCount = counts.pending;
  const pausedCount = counts.paused;
  const failedCount = counts.failed;

  const totalPages = Math.max(1, Math.ceil(totalFilteredRecipients / pageSize));
  const fromRow = totalFilteredRecipients > 0 ? (page - 1) * pageSize + 1 : 0;
  const toRow = Math.min(page * pageSize, totalFilteredRecipients);
  const retryOfBroadcastId = (broadcast.audience_filter as { retry_of_broadcast_id?: string } | null)?.retry_of_broadcast_id;

  // A campaign whose tab went away sits in 'sending' with recipients
  // still pending and nothing left to move them. Name that state rather
  // than leaving a permanently pulsing "sending" badge.
  const isStalled = broadcast.status === 'sending' && pendingCount > 0;

  const funnelSteps: FunnelStep[] = [
    { label: t('stats.sent'), value: broadcast.sent_count, color: 'bg-primary' },
    { label: t('stats.delivered'), value: broadcast.delivered_count, color: 'bg-teal-500' },
    { label: t('stats.read'), value: broadcast.read_count, color: 'bg-blue-500' },
    { label: t('stats.replied'), value: broadcast.replied_count, color: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/broadcasts')}
            className="border-border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{broadcast.name}</h1>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${status.classes}`}
              >
                {tStatus(status.label)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{t('template', { name: broadcast.template_name })}</span>
              <span>-</span>
              <span>
                {t('createdAt', { date: new Date(broadcast.created_at).toLocaleDateString() })}
              </span>
            </div>
            {retryOfBroadcastId && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-primary">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Dedicated retry broadcast for</span>
                <button
                  type="button"
                  className="font-medium underline hover:text-primary/80"
                  onClick={() => router.push(`/broadcasts/${retryOfBroadcastId}`)}
                >
                  original campaign
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {broadcast.status === 'sending' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={pausing}
              className="border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            >
              {pausing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
              {t('pauseCampaign')}
            </Button>
          )}

          {/* Delete — inline-confirm pattern matches the pipeline-settings
              "Delete Pipeline" flow. Mid-send broadcasts can't be deleted
              because orphaning in-flight Meta messages would leave the
              funnel inconsistent. */}
          {confirmDelete ? (
            <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm">
              <span className="text-red-300">{t('deletePrompt')}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="h-7 border-border bg-transparent text-muted-foreground hover:bg-muted"
              >
                {t('cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="h-7 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? t('deleting') : t('confirm')}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={broadcast.status === 'sending'}
              onClick={() => setConfirmDelete(true)}
              title={
                broadcast.status === 'sending'
                  ? t('cannotDeleteSending')
                  : t('deleteHover')
              }
              className="border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('delete')}
            </Button>
          )}
        </div>
      </div>

      {/* Resume / retry / paused banner. Only rendered when there is
          actually something outstanding. */}
      {(pendingCount > 0 || pausedCount > 0 || failedCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {isStalled ? t('resumeStalledTitle') : t('resumeTitle')}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              {isStalled
                ? t('resumeStalledHint', { count: pendingCount })
                : pausedCount > 0
                  ? t('resumePausedHint', { count: pausedCount })
                  : t('resumeHint', { count: failedCount })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pendingCount > 0 && (
              <Button
                size="sm"
                onClick={() => handleResume('pending')}
                disabled={resumingScope !== null}
              >
                {resumingScope === 'pending' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PlayCircle className="h-3.5 w-3.5" />
                )}
                {t('resumePending', { count: pendingCount })}
              </Button>
            )}
            {pausedCount > 0 && (
              <Button
                size="sm"
                onClick={() => handleRetryCampaign('paused')}
                disabled={resumingScope !== null}
                className="bg-amber-600 text-white hover:bg-amber-700"
                title="Creates a dedicated retry broadcast with full live analytics for paused contacts"
              >
                {resumingScope === 'paused' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {t('retryPaused', { count: pausedCount })}
              </Button>
            )}
            {failedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRetryCampaign('failed')}
                disabled={resumingScope !== null}
                className="border-border text-muted-foreground hover:bg-muted"
                title="Creates a dedicated retry broadcast with full live analytics for failed contacts"
              >
                {resumingScope === 'failed' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                {t('retryFailed', { count: failedCount })}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Linked dedicated retry campaigns */}
      {childRetries.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              Dedicated Retry Campaigns ({childRetries.length})
            </h3>
            <span className="text-xs text-muted-foreground">
              Independent campaigns created to retry paused or failed contacts
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {childRetries.map((r) => (
              <div
                key={r.id}
                onClick={() => router.push(`/broadcasts/${r.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border/80 bg-background/50 p-3 transition hover:border-primary/50 hover:bg-muted/30"
              >
                <div className="space-y-1 truncate pr-2">
                  <p className="text-xs font-semibold text-foreground truncate">{r.name}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{r.total_recipients.toLocaleString()} contacts</span>
                    <span>•</span>
                    <span>{r.sent_count.toLocaleString()} sent</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground capitalize">
                    {r.status}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats — 6 or 7 cards: Total / Sent / Delivered / Read / Replied / Failed / [Paused] */}
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${pausedCount > 0 ? 'lg:grid-cols-7' : 'lg:grid-cols-6'}`}>
        <StatCard
          label={t('stats.totalRecipients')}
          value={broadcast.total_recipients}
          total={broadcast.total_recipients}
          icon={<Users className="h-4 w-4" />}
          color="bg-muted text-muted-foreground"
        />
        <StatCard
          label={t('stats.sent')}
          value={broadcast.sent_count}
          total={broadcast.total_recipients}
          icon={<Send className="h-4 w-4" />}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          label={t('stats.delivered')}
          value={broadcast.delivered_count}
          total={broadcast.total_recipients}
          icon={<CheckCheck className="h-4 w-4" />}
          color="bg-teal-500/10 text-teal-400"
        />
        <StatCard
          label={t('stats.read')}
          value={broadcast.read_count}
          total={broadcast.total_recipients}
          icon={<Eye className="h-4 w-4" />}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          label={t('stats.replied')}
          value={broadcast.replied_count}
          total={broadcast.total_recipients}
          icon={<MessageCircle className="h-4 w-4" />}
          color="bg-indigo-500/10 text-indigo-400"
        />
        <StatCard
          label={t('stats.failed')}
          value={failedCount}
          total={broadcast.total_recipients}
          icon={<AlertCircle className="h-4 w-4" />}
          color="bg-red-500/10 text-red-400"
        />
        {pausedCount > 0 && (
          <StatCard
            label={t('stats.paused')}
            value={pausedCount}
            total={broadcast.total_recipients}
            icon={<PauseCircle className="h-4 w-4" />}
            color="bg-amber-500/10 text-amber-500"
          />
        )}
      </div>

      <FunnelChart steps={funnelSteps} />

      {/* Recipients Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">
              {statusFilter !== 'all' || debouncedSearch.trim()
                ? t('recipientsHeader', {
                    filtered: totalFilteredRecipients,
                    total: broadcast.total_recipients,
                  })
                : t('recipientsHeaderAll', { total: broadcast.total_recipients })}
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border text-muted-foreground hover:bg-muted"
                    />
                  }
                >
                  <Filter className="h-3.5 w-3.5" />
                  {statusFilter === 'all'
                    ? t('allStatuses')
                    : tStatus(getRecipientStatus(statusFilter).label)}
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="border-border bg-popover">
                  <DropdownMenuItem
                    onClick={() => {
                      setStatusFilter('all');
                      setPage(1);
                    }}
                    className={
                      statusFilter === 'all' ? 'text-primary' : 'text-popover-foreground'
                    }
                  >
                    {t('allStatuses')}
                  </DropdownMenuItem>
                  {RECIPIENT_STATUSES.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => {
                        setStatusFilter(s);
                        setPage(1);
                      }}
                      className={
                        statusFilter === s
                          ? 'text-primary'
                          : 'text-popover-foreground'
                      }
                    >
                      {tStatus(getRecipientStatus(s).label)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting || broadcast.total_recipients === 0}
                className="border-border text-muted-foreground hover:bg-muted"
              >
                {exporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {t('exportCsv')}
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contact name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-8 pr-3 text-sm bg-muted/40 border-border placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {totalFilteredRecipients === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {broadcast.total_recipients === 0
                ? t('noRecipients')
                : t('noRecipientsFilter')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead
                    className="cursor-pointer select-none text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('created_at')}
                  >
                    {t('table.contact')} {renderSortIcon('created_at')}
                  </TableHead>
                  <TableHead className="text-muted-foreground">{t('table.phone')}</TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('status')}
                  >
                    {t('table.status')} {renderSortIcon('status')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('sent_at')}
                  >
                    {t('table.sent')} {renderSortIcon('sent_at')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('delivered_at')}
                  >
                    {t('table.delivered')} {renderSortIcon('delivered_at')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('read_at')}
                  >
                    {t('table.read')} {renderSortIcon('read_at')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-muted-foreground hover:text-foreground"
                    onClick={() => handleSort('error_message')}
                  >
                    {t('table.error')} {renderSortIcon('error_message')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => {
                  const isPaused = isPausedRecipient(recipient);
                  const displayStatus = isPaused ? 'paused' : recipient.status;
                  const rStatus = getRecipientStatus(displayStatus);
                  return (
                    <TableRow key={recipient.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        {recipient.contact?.name ?? 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {recipient.contact?.phone ?? '-'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${rStatus.classes}`}
                        >
                          {tStatus(rStatus.label)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {recipient.sent_at
                          ? new Date(recipient.sent_at).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {recipient.delivered_at
                          ? new Date(recipient.delivered_at).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {recipient.read_at
                          ? new Date(recipient.read_at).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-red-400">
                        {recipient.error_message ?? '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination footer */}
        {totalFilteredRecipients > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <div>
              Showing {fromRow} to {toRow} of {totalFilteredRecipients.toLocaleString()} recipients
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-2.5 border-border text-foreground hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 px-2.5 border-border text-foreground hover:bg-muted disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
