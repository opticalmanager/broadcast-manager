'use client';

import { Suspense, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Broadcast, BroadcastStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Radio,
  Plus,
  Loader2,
  ChevronRight,
  FileText,
  Users,
  Search,
  Sparkles,
  RotateCcw,
  CheckCheck,
  AlertCircle,
  Eye,
  ArrowRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useCan } from '@/hooks/use-can';
import { GatedButton } from '@/components/ui/gated-button';
import { getBroadcastStatus } from '@/lib/broadcast-status';
import { useTranslations } from 'next-intl';

const POLL_INTERVAL_MS = 5_000;

function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function RateCell({
  value,
  total,
  color,
}: {
  value: number;
  total: number;
  /** Tailwind bg class for the fill, e.g. "bg-primary" */
  color: string;
}) {
  const pct = percent(value, total);
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {pct}%
      </span>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export interface TemplateSummaryItem {
  template_name: string;
  category: string;
  language: string;
  status: string;
  body_text?: string;
  campaigns_count: number;
  latest_campaign_at: string;
  first_campaign_at: string;
  total_unique_contacts: number;
  net_delivered: number;
  net_read: number;
  net_failed: number;
  net_delivery_rate: number;
  net_read_rate: number;
  gross_recipients: number;
  gross_delivered: number;
  gross_read: number;
  gross_failed: number;
}

function BroadcastsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view') === 'templates' ? 'templates' : 'campaigns';

  const t = useTranslations('Broadcasts.page');
  const tStatus = useTranslations('Broadcasts.status');
  const canCreate = useCan('send-messages');

  const [view, setView] = useState<'campaigns' | 'templates'>(initialView);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Template summaries state
  const [templateSummaries, setTemplateSummaries] = useState<TemplateSummaryItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateViewMode, setTemplateViewMode] = useState<'cards' | 'table'>('cards');

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('broadcasts')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const now = Date.now();
      const items = (data ?? []).map((b) => {
        if (b.status === 'sending') {
          const total = b.total_recipients ?? 0;
          const sent = b.sent_count ?? 0;
          const failed = b.failed_count ?? 0;
          const delivered = b.delivered_count ?? 0;
          const lastActivity = new Date(b.updated_at || b.created_at).getTime();
          const inactiveMinutes = (now - lastActivity) / (60 * 1000);

          const isStuck =
            (total > 0 && sent + failed >= total) ||
            (total > 0 && (sent + failed) / total >= 0.98 && inactiveMinutes > 3) ||
            inactiveMinutes > 15;

          if (isStuck) {
            const resolvedStatus: BroadcastStatus =
              sent > 0 || delivered > 0 ? 'sent' : 'failed';
            supabase
              .from('broadcasts')
              .update({ status: resolvedStatus, updated_at: new Date().toISOString() })
              .eq('id', b.id)
              .then(() => {});
            return { ...b, status: resolvedStatus };
          }
        }
        return b;
      });

      setBroadcasts(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await fetch('/api/whatsapp/broadcasts/template-reports');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load template reports');
      setTemplateSummaries(data.templates ?? []);
    } catch (err) {
      console.error('[broadcasts] template summaries error:', err);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const templateCount = useMemo(() => {
    return new Set(broadcasts.map((b) => b.template_name).filter(Boolean)).size;
  }, [broadcasts]);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  useEffect(() => {
    if (view === 'templates') {
      fetchTemplates();
    }
  }, [fetchTemplates, view]);

  // Keep view in sync if URL query parameter changes
  useEffect(() => {
    const v = searchParams.get('view');
    if (v === 'templates' && view !== 'templates') {
      setView('templates');
    } else if (v !== 'templates' && view === 'templates') {
      setView('campaigns');
    }
  }, [searchParams, view]);

  const anySending = useMemo(
    () => broadcasts.some((b) => b.status === 'sending'),
    [broadcasts],
  );

  useEffect(() => {
    function startPolling() {
      if (pollTimer.current) return;
      pollTimer.current = setInterval(fetchBroadcasts, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (!pollTimer.current) return;
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    function handleVisibilityChange() {
      if (!anySending) return;
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        fetchBroadcasts();
        startPolling();
      }
    }

    if (anySending && document.visibilityState === 'visible') {
      startPolling();
    } else {
      stopPolling();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [anySending, fetchBroadcasts]);

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templateSummaries;
    const q = templateSearch.toLowerCase().trim();
    return templateSummaries.filter(
      (t) =>
        t.template_name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [templateSummaries, templateSearch]);

  // Aggregate stats across all templates
  const templateMetrics = useMemo(() => {
    let totalUniqueContacts = 0;
    let totalNetDelivered = 0;
    let totalPermanentFailed = 0;
    let totalRuns = 0;

    for (const t of templateSummaries) {
      totalUniqueContacts += t.total_unique_contacts;
      totalNetDelivered += t.net_delivered;
      totalPermanentFailed += t.net_failed;
      totalRuns += t.campaigns_count;
    }

    const avgNetDelivery = totalUniqueContacts > 0
      ? Math.round((totalNetDelivered / totalUniqueContacts) * 100)
      : 0;

    return {
      templatesCount: templateSummaries.length,
      totalUniqueContacts,
      totalNetDelivered,
      totalPermanentFailed,
      totalRuns,
      avgNetDelivery,
    };
  }, [templateSummaries]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top indeterminate progress bar during live send */}
      {anySending && (
        <div
          role="progressbar"
          aria-label={t('broadcastInProgress')}
          className="broadcast-indeterminate fixed inset-x-0 top-0 z-40 h-0.5 overflow-hidden bg-muted"
        >
          <div className="broadcast-indeterminate-bar h-0.5 bg-primary" />
          <style jsx>{`
            .broadcast-indeterminate-bar {
              width: 33%;
              transform: translateX(-100%);
              animation: broadcast-slide 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
            @keyframes broadcast-slide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>
        </div>
      )}

      {/* Header & Primary Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const nextView = view === 'templates' ? 'campaigns' : 'templates';
              setView(nextView);
              router.replace(nextView === 'templates' ? '/broadcasts?view=templates' : '/broadcasts');
            }}
            className={`h-9 text-xs font-semibold border-border transition ${
              view === 'templates'
                ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm'
                : 'bg-card text-foreground hover:bg-muted border-border shadow-sm'
            }`}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            {view === 'templates' ? 'View Campaigns List' : `Template Reports (${templateCount})`}
          </Button>

          <GatedButton
            canAct={canCreate}
            gateReason="create broadcasts"
            onClick={() => router.push('/broadcasts/new')}
            className="w-full sm:w-auto h-9 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            {t('newBroadcast')}
          </GatedButton>
        </div>
      </div>

      {/* Segmented View Switcher (Mobile-native touch feel) */}
      <div className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 p-1 text-xs">
        <button
          type="button"
          onClick={() => {
            setView('campaigns');
            router.replace('/broadcasts');
          }}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-3.5 py-2 sm:py-1.5 font-semibold transition ${
            view === 'campaigns'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          Campaigns ({broadcasts.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setView('templates');
            router.replace('/broadcasts?view=templates');
          }}
          className={`flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-3.5 py-2 sm:py-1.5 font-semibold transition ${
            view === 'templates'
              ? 'bg-card text-primary shadow-sm border border-primary/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Template Performance Reports ({templateSummaries.length > 0 ? templateSummaries.length : templateCount})
        </button>
      </div>

      {/* ============================================================
          VIEW 1: BY TEMPLATE ROLLUP
         ============================================================ */}
      {view === 'templates' ? (
        <div className="space-y-4">
          {/* Quick Metrics Header */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-sm">
              <span className="text-[11px] text-muted-foreground">Templates Used</span>
              <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {templateMetrics.templatesCount}
              </p>
              <span className="text-[10px] text-muted-foreground">{templateMetrics.totalRuns} total runs</span>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-sm">
              <span className="text-[11px] text-muted-foreground">Unique Audience</span>
              <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {templateMetrics.totalUniqueContacts.toLocaleString()}
              </p>
              <span className="text-[10px] text-muted-foreground">Deduplicated contacts</span>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-sm">
              <span className="text-[11px] text-muted-foreground">Net Delivered</span>
              <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-teal-400">
                {templateMetrics.avgNetDelivery}%
              </p>
              <span className="text-[10px] text-muted-foreground">{templateMetrics.totalNetDelivered.toLocaleString()} reached</span>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-sm">
              <span className="text-[11px] text-muted-foreground">Permanent Failed</span>
              <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-red-400">
                {templateMetrics.totalPermanentFailed.toLocaleString()}
              </p>
              <span className="text-[10px] text-muted-foreground">Across all retries</span>
            </div>
          </div>

          {/* Search bar & View mode toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search templates by name or category..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="h-9 pl-8 text-xs border-border bg-card"
              />
            </div>
            <div className="hidden sm:flex items-center rounded-lg border border-border bg-card p-0.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTemplateViewMode('cards')}
                className={`h-7 px-2.5 text-xs gap-1.5 ${
                  templateViewMode === 'cards'
                    ? 'bg-muted font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTemplateViewMode('table')}
                className={`h-7 px-2.5 text-xs gap-1.5 ${
                  templateViewMode === 'table'
                    ? 'bg-muted font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </Button>
            </div>
          </div>

          {templatesLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center">
              <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">No template broadcast data yet</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                When you launch broadcasts or retry campaigns with templates, their consolidated de-duplicated reports will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* CARDS GRID (Always on mobile, and on desktop when templateViewMode === 'cards') */}
              <div
                className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${
                  templateViewMode === 'table' ? 'sm:hidden' : ''
                }`}
              >
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.template_name}
                    onClick={() =>
                      router.push(`/broadcasts/template/${encodeURIComponent(tpl.template_name)}`)
                    }
                    className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50 hover:shadow-md cursor-pointer active:scale-[0.99]"
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition truncate">
                              {tpl.template_name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {tpl.category}
                              </span>
                              <span className="rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {tpl.language}
                              </span>
                              <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium text-teal-400">
                                {tpl.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition shrink-0 mt-1" />
                      </div>

                      {/* Runs count and date */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-y border-border/40 py-1.5">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <RotateCcw className="h-3 w-3 text-primary" />
                          {tpl.campaigns_count} {tpl.campaigns_count === 1 ? 'Campaign Run' : 'Runs (Retry Chain)'}
                        </span>
                        <span>
                          {tpl.latest_campaign_at ? new Date(tpl.latest_campaign_at).toLocaleDateString() : ''}
                        </span>
                      </div>

                      {/* Key Delivery & Read Progress */}
                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2.5 text-xs">
                        <div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Net Delivery</span>
                            <span className="font-semibold text-teal-400">{tpl.net_delivery_rate}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-teal-500"
                              style={{ width: `${tpl.net_delivery_rate}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                            {tpl.net_delivered.toLocaleString()} delivered
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Net Read</span>
                            <span className="font-semibold text-blue-400">{tpl.net_read_rate}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${tpl.net_read_rate}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                            {tpl.net_read.toLocaleString()} read
                          </span>
                        </div>
                      </div>

                      {/* Audience summary */}
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">Audience: <strong className="text-foreground">{tpl.total_unique_contacts.toLocaleString()}</strong></span>
                        </div>
                        {tpl.net_failed > 0 ? (
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-400 shrink-0">
                            {tpl.net_failed.toLocaleString()} failed
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-teal-400 shrink-0">
                            ✓ 100% Resolved
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button footer */}
                    <div className="mt-3.5 pt-2.5 border-t border-border/50">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-between h-9 text-xs font-medium text-primary border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition"
                      >
                        <span>Open Report & Store Analytics</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* TABLE VIEW (Desktop only when templateViewMode === 'table') */}
              {templateViewMode === 'table' && (
                <div className="hidden overflow-x-auto rounded-xl border border-border bg-card sm:block shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Template</TableHead>
                        <TableHead className="text-muted-foreground">Runs Chain</TableHead>
                        <TableHead className="text-right text-muted-foreground">Unique Audience</TableHead>
                        <TableHead className="text-muted-foreground">Net Delivery</TableHead>
                        <TableHead className="text-muted-foreground">Net Read</TableHead>
                        <TableHead className="text-right text-muted-foreground">Net Failed</TableHead>
                        <TableHead className="text-right text-muted-foreground">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.map((tpl) => (
                        <TableRow
                          key={tpl.template_name}
                          className="cursor-pointer border-border hover:bg-muted/40 transition"
                          onClick={() =>
                            router.push(`/broadcasts/template/${encodeURIComponent(tpl.template_name)}`)
                          }
                        >
                          <TableCell className="font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div>
                                <p className="font-semibold">{tpl.template_name}</p>
                                <span className="text-[11px] text-muted-foreground">{tpl.category} • {tpl.language}</span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs font-medium bg-muted text-foreground">
                              {tpl.campaigns_count} {tpl.campaigns_count === 1 ? 'Run' : 'Runs'}
                            </span>
                          </TableCell>

                          <TableCell className="text-right tabular-nums font-semibold text-foreground">
                            {tpl.total_unique_contacts.toLocaleString()}
                          </TableCell>

                          <TableCell>
                            <RateCell
                              value={tpl.net_delivered}
                              total={tpl.total_unique_contacts}
                              color="bg-teal-500"
                            />
                          </TableCell>

                          <TableCell>
                            <RateCell
                              value={tpl.net_read}
                              total={tpl.total_unique_contacts}
                              color="bg-blue-500"
                            />
                          </TableCell>

                          <TableCell className="text-right tabular-nums">
                            {tpl.net_failed > 0 ? (
                              <span className="font-semibold text-red-400">
                                {tpl.net_failed.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-primary hover:text-primary/90"
                            >
                              View Report <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* ============================================================
            VIEW 2: BY CAMPAIGN (Existing Broadcasts List)
           ============================================================ */
        <>
          {broadcasts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-border bg-card">
              <Radio className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">{t('noBroadcastsYet')}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('createFirst')}
              </p>
              <GatedButton
                canAct={canCreate}
                gateReason="create broadcasts"
                onClick={() => router.push('/broadcasts/new')}
                className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                {t('newBroadcast')}
              </GatedButton>
            </div>
          ) : (
            <>
              {/* Mobile touch cards (sm:hidden) */}
              <div className="flex flex-col gap-3 sm:hidden">
                {broadcasts.map((broadcast) => {
                  const status = getBroadcastStatus(broadcast.status);
                  const deliveredPct = percent(broadcast.delivered_count, broadcast.total_recipients);
                  const readPct = percent(broadcast.read_count, broadcast.total_recipients);

                  return (
                    <div
                      key={broadcast.id}
                      onClick={() => router.push(`/broadcasts/${broadcast.id}`)}
                      className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 active:bg-muted/40 cursor-pointer shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-base font-semibold text-foreground">
                            {broadcast.name}
                          </h2>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            {broadcast.template_name ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/broadcasts/template/${encodeURIComponent(broadcast.template_name)}`);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition"
                                title="View template report"
                              >
                                <FileText className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{broadcast.template_name}</span>
                                <span className="text-[10px] text-muted-foreground ml-0.5">Report →</span>
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${status.classes}`}
                        >
                          {status.pulse && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-400" />
                            </span>
                          )}
                          {tStatus(status.label)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">{t('table.delivery')}: </span>
                          <span className="font-medium text-foreground">{deliveredPct}%</span>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-primary"
                              style={{ width: `${deliveredPct}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('table.read')}: </span>
                          <span className="font-medium text-foreground">{readPct}%</span>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${readPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          <span>
                            {t('table.recipients')}: <strong className="text-foreground font-medium">{broadcast.total_recipients}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>{new Date(broadcast.created_at).toLocaleDateString()}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (hidden sm:block) */}
              <div className="hidden overflow-x-auto rounded-xl border border-border bg-card sm:block shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">{t('table.name')}</TableHead>
                      <TableHead className="hidden text-muted-foreground md:table-cell">Template (Report)</TableHead>
                      <TableHead className="hidden text-right text-muted-foreground sm:table-cell">
                        {t('table.recipients')}
                      </TableHead>
                      <TableHead className="hidden text-muted-foreground lg:table-cell">{t('table.delivery')}</TableHead>
                      <TableHead className="hidden text-muted-foreground lg:table-cell">{t('table.read')}</TableHead>
                      <TableHead className="text-muted-foreground">{t('table.status')}</TableHead>
                      <TableHead className="hidden text-muted-foreground sm:table-cell">{t('table.date')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {broadcasts.map((broadcast) => {
                      const status = getBroadcastStatus(broadcast.status);
                      return (
                        <TableRow
                          key={broadcast.id}
                          className="cursor-pointer border-border hover:bg-muted/50 transition"
                          onClick={() => router.push(`/broadcasts/${broadcast.id}`)}
                        >
                          <TableCell className="font-medium text-foreground">
                            {broadcast.name}
                          </TableCell>
                          <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                            {broadcast.template_name ? (
                              <button
                                type="button"
                                onClick={() => router.push(`/broadcasts/template/${encodeURIComponent(broadcast.template_name)}`)}
                                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition shadow-sm"
                                title={`Open ${broadcast.template_name} full template report`}
                              >
                                <FileText className="h-3 w-3 text-primary" />
                                <span className="truncate max-w-[140px]">{broadcast.template_name}</span>
                                <ArrowRight className="h-3 w-3 opacity-60 ml-0.5" />
                              </button>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                            {broadcast.total_recipients}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <RateCell
                              value={broadcast.delivered_count}
                              total={broadcast.total_recipients}
                              color="bg-primary"
                            />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <RateCell
                              value={broadcast.read_count}
                              total={broadcast.total_recipients}
                              color="bg-blue-500"
                            />
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${status.classes}`}
                            >
                              {status.pulse && (
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
                                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                </span>
                              )}
                              {tStatus(status.label)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">
                            {new Date(broadcast.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function BroadcastsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <BroadcastsContent />
    </Suspense>
  );
}
