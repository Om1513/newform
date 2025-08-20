import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Scheduled Insight Reports",
  description: "Configure, schedule, summarize, and deliver ad insights for Meta and TikTok platforms",
  keywords: ["advertising", "insights", "reports", "meta", "tiktok", "automation", "analytics"],
  authors: [{ name: "Insight Reports Team" }],
  viewport: "width=device-width, initial-scale=1"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 antialiased">
        <main className="relative">
          {children}
        </main>
        <Toaster 
          richColors 
          position="top-right" 
          toastOptions={{
            style: {
              background: 'white',
              border: '1px solid rgb(226 232 240)',
              fontSize: '14px'
            }
          }}
        />
      </body>
    </html>
  );
}
