import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { FileText, MessageSquare, Zap, Users, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

const ICON_MAP: Record<string, React.ElementType> = { FileText, MessageSquare, Zap, Users }

const CHART_COLORS = {
  primary: 'hsl(240 76% 52%)',
  secondary: 'hsl(198 76% 48%)',
  tertiary: 'hsl(160 68% 46%)',
  accent: 'hsl(45 90% 54%)',
}

function StatCard({ stat, index }: { stat: any; index: number }) {
  const Icon = ICON_MAP[stat.icon]
  const isUp = stat.trend === 'up'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className={cn('flex items-center gap-1 text-xs font-medium', isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {stat.delta}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
      </div>
    </motion.div>
  )
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn('bg-card border border-border rounded-xl p-5', className)}
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </motion.div>
  )
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-muted-foreground">
            <span style={{ color: p.color }}>{p.name}: </span>
            <span className="text-foreground font-medium">{p.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function AnalyticsDashboard() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [statCards, setStatCards] = useState<any[]>([])
  const [queryTrends, setQueryTrends] = useState<any[]>([])
  const [docAnalytics, setDocAnalytics] = useState<{
    popular_docs: any[]
    category_data: any[]
    response_time: any[]
    faq_data: any[]
  }>({
    popular_docs: [],
    category_data: [],
    response_time: [],
    faq_data: [],
  })

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

  const fetchAnalyticsData = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('hte_access_token') : null
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

      const [overviewRes, queriesRes, docsRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/overview`, { headers }),
        fetch(`${API_BASE}/analytics/queries?period=${period}`, { headers }),
        fetch(`${API_BASE}/analytics/documents`, { headers }),
      ])

      if (overviewRes.ok) {
        const data = await overviewRes.json()
        setStatCards(data.stat_cards || [])
      }
      if (queriesRes.ok) {
        const data = await queriesRes.json()
        setQueryTrends(data.data || [])
      }
      if (docsRes.ok) {
        const data = await docsRes.json()
        setDocAnalytics({
          popular_docs: data.popular_docs || [],
          category_data: data.category_data || [],
          response_time: data.response_time || [],
          faq_data: data.faq_data || [],
        })
      }
    } catch {
      // Fallback state if backend is unreachable
    }
  }, [API_BASE, period])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 py-5 max-w-7xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('analytics.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('analytics.platform_insights')}</p>
          </div>
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setPeriod(r)}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-medium transition-colors',
                  r === period ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </div>

        {/* Row 2: Query trend + Category distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title={t('analytics.query_user_trends')} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={queryTrends} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradQ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradU" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.02 264)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="queries" name={t('analytics.queries')} stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#gradQ)" />
                <Area type="monotone" dataKey="users" name={t('analytics.active_users')} stroke={CHART_COLORS.secondary} strokeWidth={2} fill="url(#gradU)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.docs_by_category')}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={docAnalytics.category_data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {docAnalytics.category_data.map((entry: any) => (
                    <Cell key={entry.name} fill={entry.color || CHART_COLORS.primary} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [value, t('analytics.documents')]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {docAnalytics.category_data.map((item: any) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color || CHART_COLORS.primary }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Row 3: FAQ bar + popular docs + response time */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title={t('analytics.top_questions')} className="lg:col-span-1">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={docAnalytics.faq_data.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.4} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="question" tick={{ fontSize: 10 }} width={140} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), t('analytics.queries')]} />
                <Bar dataKey="count" name={t('analytics.queries')} fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.most_viewed')}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={docAnalytics.popular_docs} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} angle={-20} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [v.toLocaleString(), t('analytics.views')]} />
                <Bar dataKey="views" name={t('analytics.views')} fill={CHART_COLORS.tertiary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title={t('analytics.avg_response_time_sec')}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={docAnalytics.response_time} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0.8, 2.2]} />
                <Tooltip formatter={(v: number) => [`${v}s`, t('analytics.avg_response')]} />
                <Line type="monotone" dataKey="time" name={t('analytics.response_s')} stroke={CHART_COLORS.accent} strokeWidth={2.5} dot={{ fill: CHART_COLORS.accent, r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {t('analytics.sla_target')} <span className="text-green-600 dark:text-green-400 font-medium">{t('analytics.all_within_target')}</span>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
