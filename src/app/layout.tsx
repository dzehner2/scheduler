import type { Metadata } from "next";
import {
  Audiowide,
  Bangers,
  Bungee,
  Cinzel_Decorative,
  Creepster,
  Fredoka,
  Luckiest_Guy,
  Monoton,
  Orbitron,
  Pacifico,
  Permanent_Marker,
  Press_Start_2P,
  Righteous,
  Rubik_Mono_One,
  Special_Elite,
  VT323,
  Work_Sans,
} from "next/font/google";
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
const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-press-start", preload: false });
const monoton = Monoton({ weight: "400", subsets: ["latin"], variable: "--font-monoton", preload: false });
const marker = Permanent_Marker({ weight: "400", subsets: ["latin"], variable: "--font-marker", preload: false });
const typewriter = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-typewriter", preload: false });
const creepster = Creepster({ weight: "400", subsets: ["latin"], variable: "--font-creepster", preload: false });
const pacifico = Pacifico({ weight: "400", subsets: ["latin"], variable: "--font-pacifico", preload: false });
const cinzel = Cinzel_Decorative({ weight: ["700"], subsets: ["latin"], variable: "--font-cinzel", preload: false });
const luckiest = Luckiest_Guy({ weight: "400", subsets: ["latin"], variable: "--font-luckiest", preload: false });
const audiowide = Audiowide({ weight: "400", subsets: ["latin"], variable: "--font-audiowide", preload: false });
const righteous = Righteous({ weight: "400", subsets: ["latin"], variable: "--font-righteous", preload: false });
const rubikMono = Rubik_Mono_One({ weight: "400", subsets: ["latin"], variable: "--font-rubik-mono", preload: false });

export const metadata: Metadata = {
  title: "PlayDate",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const vibe = await siteVibe();
  const fonts = [
    display, lcd, body, bangers, orbitron, fredoka, pressStart, monoton, marker, typewriter,
    creepster, pacifico, cinzel, luckiest, audiowide, righteous, rubikMono,
  ]
    .map((f) => f.variable)
    .join(" ");
  return (
    <html lang="en" className={fonts}>
      <body className={vibe.className} style={vibe.style as React.CSSProperties}>
        {children}
      </body>
    </html>
  );
}
