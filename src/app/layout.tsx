import type { Metadata } from "next";
import { Bangers, Bungee, Fredoka, Orbitron, VT323, Work_Sans } from "next/font/google";
import { siteVibe } from "@/lib/site";
import "./globals.css";

// Self-hosted at build time: guests' browsers never call Google Fonts.
const display = Bungee({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const lcd = VT323({ weight: "400", subsets: ["latin"], variable: "--font-lcd" });
const body = Work_Sans({ subsets: ["latin"], variable: "--font-body" });
// Vibe heading fonts: only downloaded when a page uses them.
const bangers = Bangers({ weight: "400", subsets: ["latin"], variable: "--font-bangers", preload: false });
const orbitron = Orbitron({ weight: ["700"], subsets: ["latin"], variable: "--font-orbitron", preload: false });
const fredoka = Fredoka({ weight: ["600"], subsets: ["latin"], variable: "--font-fredoka", preload: false });

export const metadata: Metadata = {
  title: "PlayDate",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const vibe = await siteVibe();
  const fonts = [display, lcd, body, bangers, orbitron, fredoka].map((f) => f.variable).join(" ");
  return (
    <html lang="en" className={fonts}>
      <body className={`vibe-${vibe}`}>{children}</body>
    </html>
  );
}
