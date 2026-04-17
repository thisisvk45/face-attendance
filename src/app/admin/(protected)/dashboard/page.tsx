'use client'

import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from './actions'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { SkeletonCards } from '@/components/ui/skeleton-table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { format } from 'date-fns'

function WeatherIcon({ code, className = 'w-5 h-5' }: { code: number; className?: string }) {
  // Sun
  if (code === 0) return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
  // Partly cloudy
  if (code <= 3) return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /></svg>
  // Fog
  if (code <= 48) return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /><path strokeLinecap="round" d="M4 20h16M6 22h12" /></svg>
  // Rain / drizzle
  if (code <= 67 || (code >= 80 && code <= 82)) return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /><path strokeLinecap="round" d="M8 19v2m4-2v2m4-2v2" /></svg>
  // Snow
  if (code <= 86) return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /><path strokeLinecap="round" d="M9 19l.5 1.5m5-1.5l.5 1.5m-3-1.5l.5 1.5" /></svg>
  // Thunderstorm
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" /><path strokeLinecap="round" d="M13 16l-2 4h3l-2 4" /></svg>
}

function weatherColor(code: number) {
  if (code === 0) return 'text-amber-500'
  if (code <= 3) return 'text-slate-500'
  if (code <= 48) return 'text-slate-400'
  if (code <= 67 || (code >= 80 && code <= 82)) return 'text-blue-500'
  if (code <= 86) return 'text-sky-400'
  return 'text-purple-500'
}

function StatCard({ title, value, icon, color, subtitle }: {
  title: string; value: number; icon: React.ReactNode; color: string; subtitle?: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#64748B]">{title}</p>
          <p className={`text-3xl font-bold mt-1 animate-count-up ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-[#94A3B8] mt-1">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    refetchInterval: 30000,
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Attendance overview for today" />
        <SkeletonCards count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6"><div className="skeleton h-[300px]" /></div>
          <div className="bg-white rounded-xl shadow-md p-6"><div className="skeleton h-[300px]" /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Attendance overview for today" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={data.totalEmployees}
          color="text-[#1E293B]"
          icon={<svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
        />
        <StatCard
          title="Present Today"
          value={data.presentCount}
          color="text-status-present"
          icon={<svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Late Today"
          value={data.lateCount}
          color="text-status-late"
          icon={<svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Not Checked In"
          value={data.absentCount}
          color="text-status-absent"
          icon={<svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
        />
      </div>

      {/* Per-office breakdown */}
      {data.officeBreakdown && data.officeBreakdown.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[#1E293B]">Offices</h3>
            <span className="text-xs text-[#94A3B8]">
              Each office shown in its local time
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.officeBreakdown.map((o: any) => {
              const pct = o.total > 0 ? Math.round(((o.present + o.late) / o.total) * 100) : 0
              return (
                <div
                  key={o.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1E293B]">{o.name}</p>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        {o.timezone} · {o.localTime}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand/10 text-brand-dark">
                      {pct}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50/80 rounded-lg py-2">
                      <p className="text-xs text-[#64748B]">Total</p>
                      <p className="text-lg font-bold text-[#1E293B]">{o.total}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg py-2">
                      <p className="text-xs text-emerald-700">Present</p>
                      <p className="text-lg font-bold text-status-present">{o.present}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg py-2">
                      <p className="text-xs text-amber-700">Late</p>
                      <p className="text-lg font-bold text-status-late">{o.late}</p>
                    </div>
                  </div>
                  {o.weather && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                      <WeatherIcon code={o.weather.weatherCode} className={`w-5 h-5 ${weatherColor(o.weather.weatherCode)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#1E293B] truncate">{o.weather.description}</p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {Math.round(o.weather.temperatureMax)}/{Math.round(o.weather.temperatureMin)}°C
                          {o.weather.precipitation > 0 && (
                            <span className="ml-1.5 text-blue-500">{o.weather.precipitation.toFixed(1)}mm rain</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-[#94A3B8] flex items-center justify-between">
                    <span>{o.notCheckedIn} not checked in</span>
                    <span>Late after {o.late_threshold}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-base font-semibold text-[#1E293B] mb-4">Attendance by Department</h3>
          {data.departmentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.departmentData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#64748B', fontSize: 12 }} width={100} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                <Bar dataKey="count" fill="#2DD4BF" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-[#94A3B8]">No data yet</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-base font-semibold text-[#1E293B] mb-4">30-Day Trend</h3>
          {data.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.trendData}>
                <defs>
                  <linearGradient id="brandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'MMM d')} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip labelFormatter={(d) => format(new Date(d as string), 'MMM d, yyyy')} contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                <Area type="monotone" dataKey="count" stroke="#2DD4BF" fill="url(#brandGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-[#94A3B8]">No data yet</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-base font-semibold text-[#1E293B] mb-4">Today&apos;s Activity</h3>
        {data.recentLogs.length > 0 ? (
          <div className="divide-y divide-[#E2E8F0]">
            {data.recentLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between py-3 hover:bg-gray-50/50 -mx-2 px-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center ring-2 ring-brand/20">
                    <span className="text-brand font-semibold text-sm">
                      {(log.employee?.name || 'U')[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-[#1E293B]">{log.employee?.name || 'Unknown'}</p>
                    <p className="text-xs text-[#94A3B8]">{log.employee?.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={log.status} />
                  <div className="text-xs text-[#64748B] text-right min-w-[70px]">
                    {log.check_in && <p>In: {format(new Date(log.check_in), 'h:mm a')}</p>}
                    {log.check_out && <p>Out: {format(new Date(log.check_out), 'h:mm a')}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[#94A3B8]">No attendance records today</div>
        )}
      </div>
    </div>
  )
}
