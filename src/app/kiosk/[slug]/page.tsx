import { notFound } from 'next/navigation'
import { getOfficeBySlug } from '../actions'
import { KioskView } from '../kiosk-view'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const office = await getOfficeBySlug(params.slug)
  return {
    title: office ? `${office.name} – Attendance Kiosk` : 'Attendance Kiosk',
  }
}

export default async function KioskBySlugPage({ params }: { params: { slug: string } }) {
  const office = await getOfficeBySlug(params.slug)
  if (!office) notFound()
  return <KioskView office={office} />
}
