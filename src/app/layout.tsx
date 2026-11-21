import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TerraPulse - Real-Time Disaster & Weather Radar',
  description: 'Peta interaktif real-time untuk gempa bumi, tsunami, gunung api, karhutla, siklone, hujan, dan banjir. Data dari BMKG, USGS, NASA FIRMS, PVMBG, RainViewer, Open-Meteo.',
  keywords: ['gempa bumi', 'tsunami', 'gunung api', 'karhutla', 'siklone', 'cuaca', 'hujan', 'banjir', 'bencana alam', 'Indonesia', 'real-time', 'peta'],
  authors: [{ name: 'TerraPulse' }],
  creator: 'TerraPulse',
  publisher: 'TerraPulse',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://terrapulse.app',
    title: 'TerraPulse - Real-Time Disaster & Weather Radar',
    description: 'Peta interaktif real-time bencana alam Indonesia dan global',
    siteName: 'TerraPulse',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TerraPulse - Real-Time Disaster & Weather Radar',
    description: 'Peta interaktif real-time bencana alam',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.png', sizes: '32x32' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.png',
    other: [
      { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#09090B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://basemaps.cartocdn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.rainviewer.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.open-meteo.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://data.bmkg.go.id" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://earthquake.usgs.gov" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firms.modaps.eosdis.nasa.gov" crossOrigin="anonymous" />
      </head>
      <body className="h-full m-0 p-0 overflow-hidden bg-zinc-950 text-white antialiased select-none">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Register service worker for PWA
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }

              // Prevent pull-to-refresh on mobile (optional)
              document.body.addEventListener('touchmove', (e) => {
                if (e.touches.length > 1) e.preventDefault();
              }, { passive: false });
            `,
          }}
        />
      </body>
    </html>
  );
}