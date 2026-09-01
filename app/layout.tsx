import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '../src/components/ui/ToastContext';
import { ThemeProvider } from '../src/components/ui/ThemeContext';

export const metadata: Metadata = {
  title: 'ITSM Enterprise — SaaS Platform',
  description: 'Enterprise Helpdesk, IT Operations, Asset & Service Management System',
};

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('itsm_theme') || localStorage.getItem('theme');
    var isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches) || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-full bg-background text-dark antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}