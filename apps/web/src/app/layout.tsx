import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccessibilityProvider } from "@/hooks/useAccessibility";
import { ServiceWorkerClient } from "@/components/ServiceWorkerClient";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import "@/styles/accessibility.css";

// Font optimization: subset to Latin only for faster loading
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap", // Prevent layout shift
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap", // Prevent layout shift
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  title: "Civiq | Your Election Readiness Copilot",
  description: "Understand every election step before it becomes a missed opportunity. Personalized timelines, myth-checking, and voter simulations.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <meta httpEquiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * ws: wss: http://localhost:3005 http://127.0.0.1:3005;" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Preconnect to critical third-party origins */}
        <link rel="preconnect" href="https://generativelanguage.googleapis.com" />
        <link rel="preconnect" href="https://api.tavily.com" />
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        <link rel="dns-prefetch" href="https://api.tavily.com" />
      </head>
      <body className="font-sans bg-[#F5F7FB] text-[#0F172A]">
        {/* Skip to main content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-blue-600 focus:text-white focus:rounded-md"
        >
          Skip to main content
        </a>

        <AuthProvider>
          <AccessibilityProvider>
            <ServiceWorkerClient />
            {children}
            <Toaster position="bottom-center" />
          </AccessibilityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
