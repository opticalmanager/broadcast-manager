"use client"

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/currency'
import {
  MessageSquare,
  UserPlus,
  DollarSign,
  Send,
  Megaphone,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import {
  loadActivity,
  loadConversationsSeries,
  loadMetrics,
  loadPipelineDonut,
  loadResponseTime,
} from '@/lib/dashboard/queries'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  ResponseTimeSummary,
} from '@/lib/dashboard/types'

import { MetricCard } from '@/components/dashboard/metric-card'
import { SkeletonCard } from '@/components/dashboard/skeleton'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ConversationsChart } from '@/components/dashboard/conversations-chart'
import { PipelineDonut } from '@/components/dashboard/pipeline-donut'
import { ResponseTimeChart } from '@/components/dashboard/response-time-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'

import { useTranslations } from 'next-intl'

type RangeDays = 7 | 30 | 90

interface WhatsAppConfigSummary {
  connected: boolean
  phone_info?: {
    id?: string
    display_phone_number?: string
    verified_name?: string
    quality_rating?: string
    whatsapp_business_manager_messaging_limit?: string
    throughput?: { level?: string }
  }
}

export default function DashboardPage() {
  const t = useTranslations('Dashboard.page')
  const { defaultCurrency } = useAuth()
  const [metrics, setMetrics] = useState<MetricsBundle | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)

  const [range, setRange] = useState<RangeDays>(30)
  // Keep a cache per range so switching tabs doesn't re-fetch what we
  // already have. Ranges the user hasn't opened yet stay null and
  // trigger a fetch on first view.
  const [series, setSeries] = useState<Record<RangeDays, ConversationsSeriesPoint[] | null>>({
    7: null,
    30: null,
    90: null,
  })
  const [seriesLoading, setSeriesLoading] = useState(true)

  const [pipeline, setPipeline] = useState<PipelineDonutData | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)

  const [responseTime, setResponseTime] = useState<ResponseTimeSummary | null>(null)
  const [responseTimeLoading, setResponseTimeLoading] = useState(true)

  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)

  const [waConfig, setWaConfig] = useState<WhatsAppConfigSummary | null>(null)
  const [waLoading, setWaLoading] = useState(true)

  const loadAll = useCallback(() => {
    const db = createClient()

    // Kick everything off in parallel. Each block has its own
    // setState + finally so a slow query doesn't hold up faster
    // sections — each widget shows its own skeleton independently.
    void loadMetrics(db)
      .then((m) => setMetrics(m))
      .catch((err) => console.error('[dashboard] metrics failed:', err))
      .finally(() => setMetricsLoading(false))

    void fetch('/api/whatsapp/config', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setWaConfig(data))
      .catch((err) => console.error('[dashboard] whatsapp config failed:', err))
      .finally(() => setWaLoading(false))

    void loadConversationsSeries(db, 30)
      .then((s) => setSeries((prev) => ({ ...prev, 30: s })))
      .catch((err) => console.error('[dashboard] series failed:', err))
      .finally(() => setSeriesLoading(false))

    void loadPipelineDonut(db)
      .then((p) => setPipeline(p))
      .catch((err) => console.error('[dashboard] pipeline failed:', err))
      .finally(() => setPipelineLoading(false))

    void loadResponseTime(db)
      .then((r) => setResponseTime(r))
      .catch((err) => console.error('[dashboard] response time failed:', err))
      .finally(() => setResponseTimeLoading(false))

    // Fetch up to 50 so the biggest page-size option in the feed
    // (50 rows) is already in memory — switching sizes then becomes
    // a pure client-side slice with no extra round trip.
    void loadActivity(db, 50)
      .then((a) => setActivity(a))
      .catch((err) => console.error('[dashboard] activity failed:', err))
      .finally(() => setActivityLoading(false))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Range switch handler — kept in an event callback (not an effect)
  // so the setState calls stay out of the react-hooks/set-state-in-effect
  // rule's way. The cached bucket check means switching back to a
  // previously-viewed range is instant and doesn't re-fetch.
  const handleRangeChange = useCallback(
    (r: RangeDays) => {
      setRange(r)
      if (series[r] !== null) return
      setSeriesLoading(true)
      const db = createClient()
      loadConversationsSeries(db, r)
        .then((s) => setSeries((prev) => ({ ...prev, [r]: s })))
        .catch((err) => console.error('[dashboard] series failed:', err))
        .finally(() => setSeriesLoading(false))
    },
    [series],
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('description')}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metricsLoading || !metrics ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              title={t('activeConversations')}
              value={metrics.activeConversations.current.toLocaleString()}
              icon={MessageSquare}
              delta={{
                sign: metrics.activeConversations.previous,
                label: deltaLabel(
                  metrics.activeConversations.previous, 
                  t('newTodayVsYesterday'), 
                  t('noChange', { suffix: t('newTodayVsYesterday') })
                ),
              }}
            />
            <MetricCard
              title={t('newContactsToday')}
              value={metrics.newContactsToday.current.toLocaleString()}
              icon={UserPlus}
              delta={{
                sign:
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                label: deltaLabel(
                  metrics.newContactsToday.current - metrics.newContactsToday.previous,
                  t('vsYesterday'),
                  t('noChange', { suffix: t('vsYesterday') })
                ),
              }}
            />
            <MetricCard
              title={t('openDealsValue')}
              value={formatCurrency(metrics.openDealsValue, defaultCurrency)}
              icon={DollarSign}
              subtitle={t('openDeals', { count: metrics.openDealsCount })}
            />
            <MetricCard
              title={t('messagesSentToday')}
              value={metrics.messagesSentToday.current.toLocaleString()}
              icon={Send}
              delta={{
                sign:
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                label: deltaLabel(
                  metrics.messagesSentToday.current - metrics.messagesSentToday.previous,
                  t('vsYesterday'),
                  t('noChange', { suffix: t('vsYesterday') })
                ),
              }}
            />
          </>
        )}
        {waLoading ? (
          <SkeletonCard />
        ) : (
          <MetricCard
            title={t('campaignLimit')}
            value={
              waConfig?.connected
                ? formatMessagingLimit(
                    waConfig.phone_info?.whatsapp_business_manager_messaging_limit
                  )
                : '—'
            }
            icon={Megaphone}
            subtitle={
              waConfig?.connected ? (
                (() => {
                  const quality = getQualityInfo(waConfig.phone_info?.quality_rating, t)
                  const tier = getTierDisplay(
                    waConfig.phone_info?.whatsapp_business_manager_messaging_limit
                  )
                  return (
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'inline-block h-2 w-2 rounded-full shrink-0',
                          quality.color
                        )}
                      />
                      <span>
                        {quality.label}
                        {tier ? ` · ${tier}` : ''}
                      </span>
                    </span>
                  )
                })()
              ) : (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                  <span>{t('campaignLimitNotConnected')}</span>
                </span>
              )
            }
          />
        )}
      </div>

      {/* Quick actions */}
      <QuickActions />

      {/* Charts row */}
      {/* items-stretch (the grid default) stretches the two columns to
          match the tallest sibling; adding h-full on each wrapper and
          on the inner panels makes both cards actually fill that
          stretched height so their rounded borders line up. Without
          this, the pipeline card rendered at its natural (shorter)
          height while the line chart drove the row height. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="h-full lg:col-span-3">
          <ConversationsChart
            series={series}
            loading={seriesLoading}
            range={range}
            onRangeChange={handleRangeChange}
          />
        </div>
        <div className="h-full lg:col-span-2">
          <PipelineDonut
            data={pipeline}
            loading={pipelineLoading}
            currency={defaultCurrency}
          />
        </div>
      </div>

      {/* Response time */}
      <ResponseTimeChart data={responseTime} loading={responseTimeLoading} />

      {/* Activity feed */}
      <ActivityFeed items={activity} loading={activityLoading} />
    </div>
  )
}

// ------------------------------------------------------------

function deltaLabel(delta: number, suffix: string, noChangeLabel: string): string {
  if (delta === 0) return noChangeLabel
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toLocaleString()} ${suffix}`
}

function formatMessagingLimit(tier?: string | null): string {
  if (!tier) return '—'
  const normalized = tier.toUpperCase()
  switch (normalized) {
    case 'TIER_50':
      return '50 / day'
    case 'TIER_250':
      return '250 / day'
    case 'TIER_1K':
      return '1,000 / day'
    case 'TIER_10K':
      return '10,000 / day'
    case 'TIER_100K':
      return '100,000 / day'
    case 'TIER_UNLIMITED':
      return 'Unlimited'
    default:
      if (normalized.startsWith('TIER_')) {
        return `${normalized.replace('TIER_', '')} / day`
      }
      return tier
  }
}

function getTierDisplay(tier?: string | null): string | null {
  if (!tier) return null
  const normalized = tier.toUpperCase()
  switch (normalized) {
    case 'TIER_50':
    case 'TIER_250':
      return 'Tier 0'
    case 'TIER_1K':
      return 'Tier 1'
    case 'TIER_10K':
      return 'Tier 2'
    case 'TIER_100K':
      return 'Tier 3'
    case 'TIER_UNLIMITED':
      return 'Tier 4'
    default:
      return null
  }
}

function getQualityInfo(
  quality?: string | null,
  t?: { (key: 'qualityHigh' | 'qualityMedium' | 'qualityLow'): string }
) {
  const q = quality?.toUpperCase()
  if (q === 'GREEN') {
    return {
      label: t ? t('qualityHigh') : 'High Quality',
      color: 'bg-emerald-500',
    }
  }
  if (q === 'YELLOW') {
    return {
      label: t ? t('qualityMedium') : 'Medium Quality',
      color: 'bg-amber-500',
    }
  }
  if (q === 'RED') {
    return {
      label: t ? t('qualityLow') : 'Low Quality',
      color: 'bg-rose-500',
    }
  }
  return {
    label: 'Connected',
    color: 'bg-emerald-500',
  }
}
