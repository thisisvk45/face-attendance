import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { backfillWeather } from '@/lib/weather'

/**
 * Vercel Cron — runs daily at 06:00 UTC.
 * Pre-fetches today's weather for every office and saves to daily_weather.
 * Also backfills yesterday in case it was missed.
 */
export async function GET(request: Request) {
  // Verify cron secret (Vercel sets this header automatically for cron jobs)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()
  const { data: offices } = await supabase
    .from('offices')
    .select('id, name, timezone')

  if (!offices?.length) {
    return NextResponse.json({ message: 'No offices found', fetched: 0 })
  }

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  let totalFetched = 0

  const results = await Promise.allSettled(
    offices.map(async (o) => {
      const count = await backfillWeather(o.id, o.name, yesterday, today)
      totalFetched += count
      return { office: o.name, count }
    })
  )

  const details = results
    .filter((r): r is PromiseFulfilledResult<{ office: string; count: number }> => r.status === 'fulfilled')
    .map((r) => r.value)

  return NextResponse.json({
    message: `Weather cron complete`,
    fetched: totalFetched,
    details,
  })
}
