import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ITSM Enterprise — SaaS Platform',
  description: 'Enterprise Helpdesk, IT Operations, Asset & Service Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full">
      <body className="h-full bg-background text-dark antialiased">
        {children}
      </body>
    </html>
  );
}