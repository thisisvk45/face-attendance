import { AdminSidebar } from '@/components/admin-sidebar'
import { Providers } from '@/lib/providers'

export const dynamic = 'force-dynamic'

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="min-h-screen bg-[#F8FAFC]">
        <AdminSidebar />
        <main className="lg:ml-64 p-6 lg:p-8 pb-24 lg:pb-8 overflow-auto min-h-screen">
          {children}
        </main>
      </div>
    </Providers>
  )
}
