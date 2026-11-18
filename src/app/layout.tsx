import type { Metadata } from "next";
import { Bungee, VT323, Work_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted at build time: guests' browsers never call Google Fonts.
const display = Bungee({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const lcd = VT323({ weight: "400", subsets: ["latin"], variable: "--font-lcd" });
const body = Work_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "PlayDate",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${lcd.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
