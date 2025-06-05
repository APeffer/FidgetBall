import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FidgetBall - Farcaster Mini App',
  description: 'A 2D ball that rolls around based on gyroscope input',
  openGraph: {
    title: 'FidgetBall',
    description: 'A 2D ball that rolls around based on gyroscope input',
    images: ['https://your-domain.com/og-image.png'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://your-domain.com/frame-image.png',
    'fc:frame:button:1': 'Play FidgetBall',
    'fc:frame:post_url': 'https://your-domain.com',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 