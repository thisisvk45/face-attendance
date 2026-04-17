/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Handle face-api.js canvas dependency
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      encoding: false,
      fs: false,
    }
    return config
  },
  // Allow Supabase storage images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

export default nextConfig
