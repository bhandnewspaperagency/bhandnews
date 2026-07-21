import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'BhandNews — Newspaper Agency Management',
  description: 'Complete management system for Bhand News Paper Agency — hawker billing, daily supply tracking, WhatsApp notifications, and Google Sheets sync.',
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="bottom-right" richColors closeButton />

<script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fbhandnews1978back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.19" />
<script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></body>
    </html>
  );
}