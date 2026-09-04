import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme-provider";
import { ResumeProvider } from "@/components/resume-provider";
import { ToastProvider } from "@/components/toast-provider";
import { AppActionsProvider } from "@/components/app-actions-provider";
import { CommandPaletteProvider } from "@/components/command-palette-provider";
import { GlobalShortcuts } from "@/components/global-shortcuts";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { AppBackground } from "@/components/app-background";
import { SITE } from "@/constants/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.name,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/icon-192.png",
  },
  // iOS Safari ignores the web manifest for "Add to Home Screen" install
  // quality -- without these, an iOS-installed icon still opens inside
  // Safari's browser chrome (address bar, tab switcher) instead of a
  // real standalone app window. `capable: true` is what actually
  // triggers standalone mode; the title/status bar fields are cosmetic
  // polish for that same experience.
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    url: SITE.url,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    siteName: SITE.name,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#08080D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <ThemeProvider>
          <ToastProvider>
            <ResumeProvider>
              <AppActionsProvider>
                <CommandPaletteProvider>
                  <AppBackground />
                  {children}
                  <GlobalShortcuts />
                  <ServiceWorkerRegister />
                </CommandPaletteProvider>
              </AppActionsProvider>
            </ResumeProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
