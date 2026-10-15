import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/Navbar";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AiChatbot } from "@/components/AiChatbot";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Buen Bocado – Rescata comida, ahorra dinero",
  description: "Marketplace AI-Native de excedentes de comida en Monterrey. Compra paquetes de restaurantes locales con hasta 70% de descuento.",
  manifest: "/manifest.json",
  applicationName: "Buen Bocado",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Buen Bocado",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const themeScript = `(function(){try{var t=localStorage.getItem('2g2g-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans min-h-screen`} suppressHydrationWarning>
        <ThemeProvider>
          <ServiceWorkerRegister />
          <Navbar />
          <main>{children}</main>
          <AiChatbot />
        </ThemeProvider>
      </body>
    </html>
  );
}
