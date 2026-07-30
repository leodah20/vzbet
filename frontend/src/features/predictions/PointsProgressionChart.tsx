import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PointsProgressionEntry } from '../../lib/pointsProgression'

interface PointsProgressionChartProps {
  data: PointsProgressionEntry[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function PointsProgressionChart({ data }: PointsProgressionChartProps) {
  if (data.length === 0) {
    return <p className="p-4 text-center text-sm text-slate-500">Ainda sem palpites pontuados.</p>
  }

  const chartData = data.map((entry) => ({ ...entry, label: formatDate(entry.date) }))

  return (
    <div
      className="h-48 w-full rounded-lg border border-brand-blue/20 bg-white p-3"
      data-testid="points-progression-chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="pointsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value: number) => [`${value} pts`, 'Total']}
            labelFormatter={(label: string) => `Jogo de ${label}`}
            contentStyle={{ borderRadius: 8, borderColor: '#1d4ed8' }}
          />
          <Area
            type="monotone"
            dataKey="cumulativePoints"
            stroke="#1d4ed8"
            strokeWidth={2}
            fill="url(#pointsFill)"
            dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
