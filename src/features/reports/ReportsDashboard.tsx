import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download, TrendingUp, Users, Receipt, Package } from 'lucide-react'
import { reportsService, type ReportParams } from '@/services/reports.service'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { ErrorState } from '@/components/feedback/EmptyState'
import { SkeletonCard } from '@/components/feedback/LoadingSkeleton'
import { formatCurrency, formatNumber } from '@/utils/format'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const REPORT_TABS = ['Revenue', 'Patients', 'Stock', 'Platform'] as const
type ReportTab = typeof REPORT_TABS[number]

export function ReportsDashboard() {
  const { toast } = useToast()
  const [activeReport, setActiveReport] = useState<ReportTab>('Revenue')
  const [params, setParams] = useState<ReportParams>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const { data: revenue, isLoading: revLoading, isError: revError, refetch: refetchRev } = useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: () => reportsService.getRevenue(params),
    enabled: activeReport === 'Revenue',
    retry: false,
  })

  const { data: patients, isLoading: patLoading, isError: patError, refetch: refetchPat } = useQuery({
    queryKey: ['reports', 'patients', params],
    queryFn: () => reportsService.getPatientVolume(params),
    enabled: activeReport === 'Patients',
    retry: false,
  })

  const { data: stock, isLoading: stockLoading, isError: stockError, refetch: refetchStock } = useQuery({
    queryKey: ['reports', 'stock', params],
    queryFn: () => reportsService.getStock(params),
    enabled: activeReport === 'Stock',
    retry: false,
  })

  const { data: platform, isLoading: platLoading, isError: platError, refetch: refetchPlat } = useQuery({
    queryKey: ['reports', 'platform', params],
    queryFn: () => reportsService.getPlatformStats(params),
    enabled: activeReport === 'Platform',
    retry: false,
  })

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const blob = await reportsService.exportCsv(activeReport.toLowerCase(), params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeReport.toLowerCase()}-report-${params.startDate}-${params.endDate}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('error', 'Export failed', 'The export service may be unavailable for this report.')
    }
  }

  const isLoading = revLoading || patLoading || stockLoading || platLoading
  const isError = revError || patError || stockError || platError
  const refetch = () => {
    if (activeReport === 'Revenue') refetchRev()
    else if (activeReport === 'Patients') refetchPat()
    else if (activeReport === 'Stock') refetchStock()
    else refetchPlat()
  }

  const currentData = (activeReport === 'Revenue' ? revenue : activeReport === 'Patients' ? patients : activeReport === 'Stock' ? stock : platform) as Record<string, unknown> | null ?? {}

  const safeCurrentData = currentData as {
    summary?: Record<string, number>
    trend?: Record<string, unknown>[]
    rows?: Record<string, unknown>[]
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Operational reports"
        description="Export in CSV or PDF."
        breadcrumbs={[{ label: 'Reports' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => handleExport('csv')}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => handleExport('pdf')}>
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Date filter */}
      <Card padding="sm">
        <div className="flex flex-wrap gap-3 items-end">
          <Input
            label="From"
            type="date"
            value={params.startDate}
            onChange={(e) => setParams({ ...params, startDate: e.target.value })}
            className="w-40"
          />
          <Input
            label="To"
            type="date"
            value={params.endDate}
            onChange={(e) => setParams({ ...params, endDate: e.target.value })}
            className="w-40"
          />
          <Button variant="primary" size="sm" leftIcon={<BarChart3 className="w-4 h-4" />}>
            Apply
          </Button>
        </div>
      </Card>

      {/* Report tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveReport(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeReport === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {isLoading && <SkeletonCard lines={6} />}
      {isError && <ErrorState onRetry={refetch} message="Failed to load report data. The report endpoint may not be available." />}

      {!isLoading && !isError && (
        <div className="space-y-4">
          {/* Summary metrics */}
          {safeCurrentData.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(safeCurrentData.summary).map(([key, val]) => (
                <div key={key} className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {typeof val === 'number' && key.includes('revenue') ? formatCurrency(val) : formatNumber(val)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {safeCurrentData.trend && Array.isArray(safeCurrentData.trend) && (
            <Card>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">{activeReport} Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={safeCurrentData.trend} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {Object.keys(safeCurrentData.trend[0] ?? {}).filter(k => k !== 'date').map((key, i) => (
                    <Bar key={key} dataKey={key} fill={['#2563eb','#22c55e','#f59e0b','#ef4444'][i % 4]} radius={[3,3,0,0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Table */}
          {safeCurrentData.rows && Array.isArray(safeCurrentData.rows) && safeCurrentData.rows.length > 0 && (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {Object.keys(safeCurrentData.rows[0]).map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {safeCurrentData.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-4 py-3 text-slate-700">
                            {String(val ?? '—')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {!safeCurrentData.summary && !safeCurrentData.trend && !safeCurrentData.rows && (
            <div className="text-center py-16 text-slate-400">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Report data not available for this period.</p>
              <p className="text-xs mt-1">This may indicate the report endpoint is not yet implemented on the backend.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
