import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-6">
          <img src="/logo.svg" alt="FaceAttend" className="h-10 w-10" />
        </div>
        <h1 className="text-6xl font-bold text-brand mb-2">404</h1>
        <h2 className="text-xl font-semibold text-[#1E293B] mb-2">Page Not Found</h2>
        <p className="text-[#64748B] mb-6">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-medium transition-colors"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/kiosk"
            className="inline-flex items-center px-4 py-2 border border-[#E2E8F0] hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
          >
            Kiosk Mode
          </Link>
        </div>
      </div>
    </div>
  )
}
