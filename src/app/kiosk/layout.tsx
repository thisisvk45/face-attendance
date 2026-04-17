import { Providers } from '@/lib/providers'

export const dynamic = 'force-dynamic'

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>
}
