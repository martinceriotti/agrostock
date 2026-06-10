import type { NextConfig } from "next";

const securityHeaders = [
  // Evita que la app se embeba en iframes de otros sitios (clickjacking)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Evita que el browser intente adivinar el content-type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Controla qué información del referrer se envía al navegar
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Deshabilita features del browser que no usa la app (excepto geolocation, usada en aplicaciones de campo)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)' },
  // CSP: restringe de dónde puede cargar recursos el browser
  // unsafe-inline y unsafe-eval son necesarios para Next.js App Router (hydration + Tailwind)
  // connect-src permite las llamadas a Supabase
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;
