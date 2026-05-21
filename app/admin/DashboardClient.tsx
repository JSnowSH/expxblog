'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { useAdminTheme } from '@/components/admin/AdminThemeProvider'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface AnalyticsData {
  period: string
  days: number
  totalViews: number
  uniqueVisitors: number
  prevTotalViews: number
  prevUniqueVisitors: number
  topPosts: Array<{
    post_id: number | null
    post_slug: string | null
    post_title: string | null
    views: number
  }>
  viewsByDay: Array<{ date: string; views: number; unique: number }>
  viewsByHour: Array<{ hour: number; label: string; views: number }>
  viewsByWeekday: Array<{ weekday: string; weekdayIndex: number; views: number }>
  referrers: Array<{ referrer: string; views: number }>
  pageTypes: Array<{ type: string; views: number }>
  todayViews: number
  yesterdayViews: number
  onlineNow: number
}

interface BlogStats {
  total: number
  published: number
  drafts: number
  categories: number
  tags: number
}

function calcChange(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) return { value: current > 0 ? '+100%' : '0%', positive: current > 0 }
  const pct = ((current - previous) / previous) * 100
  return { value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, positive: pct >= 0 }
}

function StatCard({
  label,
  value,
  sub,
  badge,
  iconClass,
  icon,
}: {
  label: string
  value: string
  sub: string
  badge?: { value: string; positive: boolean }
  iconClass: string
  icon: React.ReactNode
}) {
  return (
    <div className="admin-stat">
      <div className="flex items-start justify-between mb-3">
        <div className={iconClass}>{icon}</div>
        {badge && (
          <span className={badge.positive ? 'admin-badge-up' : 'admin-badge-down'}>
            {badge.value}
          </span>
        )}
      </div>
      <p className="text-[26px] font-bold leading-none mb-1 admin-text-primary">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide admin-text-secondary">{label}</p>
      <p className="text-[11px] mt-0.5 admin-text-secondary">{sub}</p>
    </div>
  )
}

function SectionCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`admin-card overflow-hidden ${className}`}>
      <div className="admin-card-header">
        <h2 className="text-[13px] font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function DashboardClient() {
  const { theme } = useAdminTheme()
  const isDark = theme === 'dark'

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [stats, setStats] = useState<BlogStats>({ total: 0, published: 0, drafts: 0, categories: 0, tags: 0 })
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [analyticsRes, blogRes] = await Promise.all([
        fetch(`/api/admin/analytics?period=${period}`),
        fetch('/api/admin/posts?limit=1'),
      ])
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json())
      if (blogRes.ok) {
        const d = await blogRes.json()
        setStats((s) => ({ ...s, total: d.total ?? 0 }))
      }

      const [pubRes, catRes, tagRes] = await Promise.all([
        fetch('/api/admin/posts?limit=1&status=published'),
        fetch('/api/admin/categories'),
        fetch('/api/admin/tags'),
      ])
      if (pubRes.ok) {
        const d = await pubRes.json()
        setStats((s) => ({ ...s, published: d.total ?? 0, drafts: s.total - (d.total ?? 0) }))
      }
      if (catRes.ok) {
        const d = await catRes.json()
        setStats((s) => ({ ...s, categories: d.categories?.length ?? 0 }))
      }
      if (tagRes.ok) {
        const d = await tagRes.json()
        setStats((s) => ({ ...s, tags: d.tags?.length ?? 0 }))
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const periods = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: '365d', label: '12m' },
  ]

  // Theme-aware chart colours
  const chartColors = isDark
    ? {
        line1: '#60a5fa',
        line1Fill: 'rgba(96,165,250,0.1)',
        line2: '#a78bfa',
        line2Fill: 'rgba(167,139,250,0.06)',
        barPeak: 'rgba(251,146,60,0.9)',
        barRest: 'rgba(96,165,250,0.65)',
        tooltip: { bg: '#1e2336', title: '#e2e8f0', body: '#94a3b8', border: 'rgba(255,255,255,0.08)' },
        grid: 'rgba(255,255,255,0.05)',
        tick: '#64748b',
        legend: '#94a3b8',
      }
    : {
        line1: '#2563eb',
        line1Fill: 'rgba(37,99,235,0.08)',
        line2: '#8b5cf6',
        line2Fill: 'rgba(139,92,246,0.04)',
        barPeak: 'rgba(245,138,45,0.9)',
        barRest: 'rgba(37,99,235,0.6)',
        tooltip: { bg: '#1e2130', title: '#e5e7eb', body: '#9ca3af', border: 'rgba(0,0,0,0.1)' },
        grid: 'rgba(0,0,0,0.04)',
        tick: '#9ca3af',
        legend: '#6b7280',
      }

  const d = analytics
  const viewsChange = d ? calcChange(d.totalViews, d.prevTotalViews) : { value: '0%', positive: true }
  const visitorsChange = d ? calcChange(d.uniqueVisitors, d.prevUniqueVisitors) : { value: '0%', positive: true }
  const todayChange = d ? calcChange(d.todayViews, d.yesterdayViews) : { value: '0%', positive: true }

  const dailyChartData = d
    ? {
        labels: d.viewsByDay.map((v) =>
          new Date(v.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        ),
        datasets: [
          {
            label: 'Views',
            data: d.viewsByDay.map((v) => v.views),
            borderColor: chartColors.line1,
            backgroundColor: chartColors.line1Fill,
            fill: true,
            tension: 0.4,
            pointRadius: d.viewsByDay.length > 60 ? 0 : 3,
            pointHoverRadius: 5,
            borderWidth: 2,
          },
          {
            label: 'Únicos',
            data: d.viewsByDay.map((v) => v.unique),
            borderColor: chartColors.line2,
            backgroundColor: chartColors.line2Fill,
            fill: true,
            tension: 0.4,
            pointRadius: d.viewsByDay.length > 60 ? 0 : 3,
            pointHoverRadius: 5,
            borderWidth: 2,
          },
        ],
      }
    : null

  const barBg = (arr: number[]) =>
    arr.map((v) => (v === Math.max(...arr) ? chartColors.barPeak : chartColors.barRest))

  const hourlyChartData = d
    ? {
        labels: d.viewsByHour.map((h) => `${h.hour}h`),
        datasets: [{ label: 'Views', data: d.viewsByHour.map((h) => h.views), backgroundColor: barBg(d.viewsByHour.map((h) => h.views)), borderRadius: 4 }],
      }
    : null

  const weekdayChartData = d
    ? {
        labels: d.viewsByWeekday.map((w) => w.weekday),
        datasets: [{ label: 'Views', data: d.viewsByWeekday.map((w) => w.views), backgroundColor: barBg(d.viewsByWeekday.map((w) => w.views)), borderRadius: 4 }],
      }
    : null

  const pageTypeChartData =
    d && d.pageTypes.length > 0
      ? {
          labels: d.pageTypes.map((p) => p.type),
          datasets: [{
            data: d.pageTypes.map((p) => p.views),
            backgroundColor: isDark
              ? ['rgba(96,165,250,0.85)','rgba(251,146,60,0.85)','rgba(74,222,128,0.85)','rgba(167,139,250,0.85)','rgba(244,114,182,0.85)','rgba(148,163,184,0.85)']
              : ['rgba(37,99,235,0.85)','rgba(245,138,45,0.85)','rgba(34,197,94,0.85)','rgba(139,92,246,0.85)','rgba(236,72,153,0.85)','rgba(107,114,128,0.85)'],
            borderWidth: 0,
          }],
        }
      : null

  const topPostsChartData =
    d && d.topPosts.length > 0
      ? {
          labels: d.topPosts.map((p) => p.post_title || 'Removido'),
          datasets: [{
            label: 'Views',
            data: d.topPosts.map((p) => p.views),
            backgroundColor: isDark ? 'rgba(96,165,250,0.65)' : 'rgba(37,99,235,0.65)',
            hoverBackgroundColor: isDark ? 'rgba(96,165,250,0.85)' : 'rgba(37,99,235,0.85)',
            borderRadius: 4,
          }],
        }
      : null

  const tooltipStyle = {
    backgroundColor: chartColors.tooltip.bg,
    titleColor: chartColors.tooltip.title,
    bodyColor: chartColors.tooltip.body,
    borderColor: chartColors.tooltip.border,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    titleFont: { size: 12 as number },
    bodyFont: { size: 12 as number },
  }

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: tooltipStyle,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 as number }, color: chartColors.tick, maxRotation: 45 },
        border: { display: false },
      },
      y: {
        grid: { color: chartColors.grid, drawTicks: false },
        ticks: { font: { size: 10 as number }, color: chartColors.tick, padding: 8 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }

  const lineOptions = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 11 as number }, boxWidth: 10, padding: 16, color: chartColors.legend },
      },
    },
  }

  const blogStatItems = [
    { label: 'Publicados', value: stats.published, color: isDark ? '#4ade80' : '#16a34a', dot: isDark ? '#4ade80' : '#16a34a' },
    { label: 'Rascunhos', value: stats.drafts, color: isDark ? '#fbbf24' : '#d97706', dot: isDark ? '#fbbf24' : '#d97706' },
    { label: 'Categorias', value: stats.categories, color: isDark ? '#60a5fa' : '#2563eb', dot: isDark ? '#60a5fa' : '#2563eb' },
    { label: 'Tags', value: stats.tags, color: isDark ? '#fb923c' : '#ea580c', dot: isDark ? '#fb923c' : '#ea580c' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm admin-text-secondary">Carregando dados…</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="text-sm mt-1 admin-page-subtitle">Visão geral do seu blog</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="admin-period-toggle">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`admin-period-btn ${period === p.value ? 'active' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link href="/admin/artigos/novo" className="admin-btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Artigo
          </Link>
        </div>
      </div>

      {/* Primary metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Views" value={d?.totalViews.toLocaleString('pt-BR') || '0'} sub="vs período anterior" badge={viewsChange}
          iconClass="admin-icon-blue"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
        />
        <StatCard
          label="Únicos" value={d?.uniqueVisitors.toLocaleString('pt-BR') || '0'} sub="visitantes únicos" badge={visitorsChange}
          iconClass="admin-icon-purple"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Hoje" value={d?.todayViews.toLocaleString('pt-BR') || '0'} sub="vs ontem" badge={todayChange}
          iconClass="admin-icon-green"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <StatCard
          label="Média/dia" value={d && d.totalViews > 0 ? (d.totalViews / d.days).toFixed(1) : '0'} sub="views por dia"
          iconClass="admin-icon-orange"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
        <StatCard
          label="Online" value={String(d?.onlineNow || 0)} sub="últimos 5 min"
          iconClass="admin-icon-teal"
          icon={<span className="relative flex h-4 w-4 items-center justify-center"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-50"/><span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"/></span>}
        />
        <StatCard
          label="Pgs/Visitante" value={d && d.totalViews > 0 ? (d.totalViews / Math.max(d.uniqueVisitors, 1)).toFixed(1) : '0'} sub="profundidade"
          iconClass="admin-icon-gray"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        />
      </div>

      {/* Blog content stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {blogStatItems.map((item) => (
          <div key={item.label} className="admin-card px-5 py-4 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.dot }} />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide admin-text-secondary">{item.label}</p>
              <p className="text-2xl font-bold leading-tight" style={{ color: item.color }}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily trend */}
      {dailyChartData && (
        <SectionCard title="Tendência de acessos" className="mb-6">
          <div className="h-64">
            <Line data={dailyChartData} options={lineOptions} />
          </div>
        </SectionCard>
      )}

      {/* Hourly + Weekday */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {hourlyChartData && (
          <SectionCard title="Acessos por hora">
            <div className="h-52"><Bar data={hourlyChartData} options={baseOptions} /></div>
          </SectionCard>
        )}
        {weekdayChartData && (
          <SectionCard title="Acessos por dia da semana">
            <div className="h-52"><Bar data={weekdayChartData} options={baseOptions} /></div>
          </SectionCard>
        )}
      </div>

      {/* Top posts + Page types + Traffic source */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {topPostsChartData && (
          <div className="lg:col-span-2 admin-card overflow-hidden">
            <div className="admin-card-header">
              <h2 className="text-[13px] font-semibold">Artigos mais vistos</h2>
            </div>
            <div className="p-5 h-72">
              <Bar
                data={topPostsChartData}
                options={{
                  ...baseOptions,
                  indexAxis: 'y' as const,
                  plugins: {
                    ...baseOptions.plugins,
                    tooltip: {
                      ...tooltipStyle,
                      callbacks: {
                        title: (items) => d?.topPosts[items[0].dataIndex]?.post_title || 'Removido',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {pageTypeChartData && (
            <div className="admin-card overflow-hidden flex-1">
              <div className="admin-card-header">
                <h2 className="text-[13px] font-semibold">Tipos de página</h2>
              </div>
              <div className="p-5 h-44">
                <Doughnut
                  data={pageTypeChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                      legend: {
                        position: 'right' as const,
                        labels: { font: { size: 11 as number }, boxWidth: 10, padding: 8, color: chartColors.legend },
                      },
                      tooltip: tooltipStyle,
                    },
                  }}
                />
              </div>
            </div>
          )}

          {d && d.referrers.length > 0 && (
            <div className="admin-card overflow-hidden flex-1">
              <div className="admin-card-header">
                <h2 className="text-[13px] font-semibold">Origem do tráfego</h2>
              </div>
              <div className="p-5 space-y-3">
                {d.referrers.slice(0, 6).map((r, idx) => {
                  const total = d.referrers.reduce((a, b) => a + b.views, 0) || 1
                  const pct = Math.round((r.views / total) * 100)
                  return (
                    <div key={'ref-' + idx} className="flex items-center gap-3">
                      <span className="text-[12px] admin-text-secondary w-24 truncate shrink-0" title={r.referrer}>
                        {r.referrer}
                      </span>
                      <div className="flex-1 admin-progress-bg rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full admin-progress-fill transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] admin-text-secondary w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center pb-4">
        <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors" style={{ color: isDark ? '#60a5fa' : '#2563eb' }}>
          Ver analytics completo
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </Link>
      </div>
    </div>
  )
}
