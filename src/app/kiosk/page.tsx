import Link from 'next/link'
import { getOffices } from './actions'

export const metadata = {
  title: 'Attendance Kiosk',
}

// Always re-render: office list rarely changes, but we want fresh on each visit.
export const revalidate = 0

function tzShortName(tz: string): string {
  try {
    return (
      new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
        .formatToParts(new Date())
        .find((p) => p.type === 'timeZoneName')?.value ?? tz
    )
  } catch {
    return tz
  }
}

function localTime(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date())
  } catch {
    return ''
  }
}

export default async function KioskPickerPage() {
  const offices = await getOffices()

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center px-4">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src="/logo.svg" alt="FaceAttend" className="h-12 w-12" />
            <span className="text-brand font-bold text-3xl">FaceAttend</span>
          </div>
          <h1 className="text-white text-2xl font-semibold">Which office is this kiosk at?</h1>
          <p className="text-[#94A3B8] mt-2 text-sm">
            Pick an office to start the attendance kiosk for that location.
          </p>
        </div>

        {offices.length === 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-200 text-center">
            No offices configured. Ask the admin to add at least one office.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {offices.map((o) => (
              <Link
                key={o.id}
                href={`/kiosk/${o.slug}`}
                className="group bg-white/5 border border-white/10 hover:border-brand/60 hover:bg-white/10 rounded-2xl p-5 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-white text-xl font-bold group-hover:text-brand transition-colors">
                    {o.name}
                  </h2>
                  <span className="text-[10px] uppercase tracking-wider text-brand/80 bg-brand/10 border border-brand/30 px-2 py-0.5 rounded-full">
                    {tzShortName(o.timezone)}
                  </span>
                </div>
                <p className="text-[#94A3B8] text-sm mb-4">{o.timezone}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-mono text-2xl font-semibold">
                    {localTime(o.timezone)}
                  </span>
                  <span className="text-[#64748B] text-xs">local</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="text-center text-[#64748B] text-xs mt-8">
          Tip: bookmark <span className="font-mono text-[#94A3B8]">/kiosk/&lt;slug&gt;</span> on
          each device so it opens straight to its office.
        </p>
      </div>
    </div>
  )
}
