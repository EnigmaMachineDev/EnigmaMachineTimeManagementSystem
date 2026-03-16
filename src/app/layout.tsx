import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/contexts/AppContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Enigma Time Management System",
  description: "Personal time management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProvider>
          <TooltipProvider>
            <div className="flex min-h-screen flex-col md:flex-row">
              <Sidebar />
              <main className="flex-1 overflow-auto">
                <div className="container mx-auto max-w-5xl p-4 md:p-6">
                  {children}
                </div>
              </main>
            </div>
          </TooltipProvider>
        </AppProvider>
      </body>
    </html>
  );
}
