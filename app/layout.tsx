import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "GEOINT — Global Intelligence Dashboard",
  description: "Real-time geopolitical intelligence: China, Russia, Israel, Iran, USA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="bg-[#0D0D0F] text-[#E8E8E8] antialiased">{children}</body>
    </html>
  );
}
