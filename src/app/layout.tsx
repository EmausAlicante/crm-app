import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { countDueActions } from "@/lib/pipeline";
import Header from "./Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM MATIC",
  description: "CRM comercial para la red de distribuidores MATIC",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, dueCount, headerList] = await Promise.all([getSettings(), countDueActions(), headers()]);
  const isLoginPage = headerList.get("x-pathname") === "/login";

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {!isLoginPage && <Header logoUrl={settings.logoUrl} dueCount={dueCount} timezone={settings.timezone} />}
        <main className="flex-1 w-full px-4 sm:px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
