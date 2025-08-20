// web/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Scheduled Insight Reports",
  description: "Configure, schedule, summarize, and deliver ad insights"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
