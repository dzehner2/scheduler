/**
 * Building blocks for data-driven vibes: fonts, background patterns, color
 * safety, and turning a vibe spec into CSS variables. Pure (no database), so
 * it can be used on the server, in the browser and in tests.
 */

// ---------- Fonts (all self-hosted via next/font in app/layout.tsx) ----------

export const FONTS = {
  bungee: { css: "var(--font-display)", label: "Bungee: chunky arcade marquee", upper: false },
  bangers: { css: "var(--font-bangers)", label: "Bangers: comic book lettering", upper: false },
  orbitron: { css: "var(--font-orbitron)", label: "Orbitron: futuristic, sci-fi", upper: true },
  fredoka: { css: "var(--font-fredoka)", label: "Fredoka: soft, friendly, rounded", upper: false },
  "press-start": { css: "var(--font-press-start)", label: "Press Start 2P: 8-bit video game", upper: true },
  monoton: { css: "var(--font-monoton)", label: "Monoton: neon tube sign", upper: true },
  "permanent-marker": { css: "var(--font-marker)", label: "Permanent Marker: hand-drawn, graffiti, grunge", upper: false },
  "special-elite": { css: "var(--font-typewriter)", label: "Special Elite: worn typewriter, case files", upper: false },
  creepster: { css: "var(--font-creepster)", label: "Creepster: spooky, horror", upper: false },
  pacifico: { css: "var(--font-pacifico)", label: "Pacifico: surf script, beachy", upper: false },
  cinzel: { css: "var(--font-cinzel)", label: "Cinzel Decorative: fantasy, castles, legends", upper: false },
  "luckiest-guy": { css: "var(--font-luckiest)", label: "Luckiest Guy: bouncy cartoon", upper: false },
  audiowide: { css: "var(--font-audiowide)", label: "Audiowide: tech, gadgets, racing", upper: false },
  righteous: { css: "var(--font-righteous)", label: "Righteous: retro diner, groovy", upper: false },
  "rubik-mono": { css: "var(--font-rubik-mono)", label: "Rubik Mono One: bold block letters, hip-hop flyers", upper: true },
} as const;

export type FontId = keyof typeof FONTS;
export const FONT_IDS = Object.keys(FONTS) as FontId[];

// ---------- Patterns ----------

export const PATTERNS = {
  confetti: "Memphis confetti: squiggles, triangles and dots",
  halftone: "comic book halftone dots",
  grid: "glowing grid lines",
  stars: "starry night sky",
  skyline: "night city skyline under a full moon",
  plaid: "plaid couch fabric",
  stripes: "bold diagonal stripes",
  sunset: "horizontal sunset bands",
  waves: "rolling ocean waves",
  zigzag: "zigzag color blocks",
  polka: "soft polka dots",
  scanlines: "old TV scanlines",
  sparkle: "magic sparkles",
  splat: "slime splats and drips",
  pixels: "8-bit pixel blocks",
  graph: "graph paper",
} as const;

export type PatternId = keyof typeof PATTERNS;
export const PATTERN_IDS = Object.keys(PATTERNS) as PatternId[];

// ---------- Spec ----------

export interface VibeColors {
  pageBg: string; // page background behind cards
  softBg: string; // calm background for the dashboard
  ink: string; // outlines, shadows, headings (must be dark: readable on white)
  accent: string; // main buttons
  accent2: string; // selected day, highlights
  accent3: string; // stickers and small accents
  link: string; // links (readable on white)
  led: string; // glowing time buttons text
  ledBg: string; // time buttons background (dark)
  navBg: string; // dashboard top bar
}

export interface VibeSpec {
  id: string;
  name: string;
  blurb: string;
  tagline: string;
  pick: string;
  done: string;
  font: FontId;
  pattern: PatternId;
  colors: VibeColors;
  radius?: number;
}

// ---------- Color helpers ----------

const HEX = /^#[0-9a-fA-F]{6}$/;
export const isHex = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
function lum(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
/** Mix two hex colors; t = share of b. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const h = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  return `#${h(ar + (br - ar) * t)}${h(ag + (bg - ag) * t)}${h(ab + (bb - ab) * t)}`;
}
/** Near-white or near-black, whichever reads better on bg. */
export const readable = (bg: string) => (contrast(bg, "#ffffff") >= contrast(bg, "#111111") ? "#ffffff" : "#111111");
/** Darken a color until it reaches the target contrast against white. */
export function darkenFor(hex: string, target: number): string {
  let c = hex;
  for (let i = 0; i < 20 && contrast(c, "#ffffff") < target; i++) c = mix(c, "#000000", 0.12);
  return c;
}

/**
 * Make any set of colors safe to use: valid hex, readable text and links on
 * white cards, readable glowing times, readable nav text. Never trusts input.
 */
export function safeColors(c: Partial<VibeColors>): VibeColors {
  const pick = (v: unknown, fallback: string) => (isHex(v) ? v : fallback);
  const ink = darkenFor(pick(c.ink, "#1d1238"), 7);
  // Time buttons always sit on a dark "clock radio" face.
  let ledBg = pick(c.ledBg, "#1a1020");
  if (contrast(ledBg, "#ffffff") < 7) ledBg = darkenFor(ledBg, 12);
  let led = pick(c.led, "#ff3b30");
  if (contrast(led, ledBg) < 4.5) led = readable(ledBg);
  return {
    pageBg: pick(c.pageBg, "#fff4e0"),
    softBg: contrast(pick(c.softBg, "#f6f3ec"), ink) >= 7 ? pick(c.softBg, "#f6f3ec") : "#f6f3ec",
    ink,
    accent: pick(c.accent, "#ff2e88"),
    accent2: pick(c.accent2, "#00a7a7"),
    accent3: pick(c.accent3, "#ffc926"),
    link: darkenFor(pick(c.link, ink), 4.5),
    led,
    ledBg,
    navBg: pick(c.navBg, "#ffffff"),
  };
}

// ---------- Patterns as CSS ----------

const svg = (body: string, w: number, h: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;

export interface PatternCss {
  image: string;
  size: string;
  repeat: string;
  position: string;
  attach: "scroll" | "fixed";
}

export function patternCss(p: PatternId, c: VibeColors): PatternCss {
  const a = c.accent, b = c.accent2, y = c.accent3, k = c.ink;
  const tile = (image: string, size: string): PatternCss => ({ image, size, repeat: "repeat", position: "0 0", attach: "scroll" });
  switch (p) {
    case "confetti":
      return tile(
        svg(
          `<g fill='none' stroke-width='5' stroke-linecap='round'><path d='M20 40 q10 -14 20 0 t20 0 t20 0' stroke='${b}'/><path d='M170 200 q10 -14 20 0 t20 0 t20 0' stroke='${a}'/><path d='M60 180 l10 10' stroke='${k}'/></g><path d='M150 110 l16 28 h-32 z' fill='${y}'/><circle cx='120' cy='30' r='6' fill='${k}'/><circle cx='230' cy='130' r='5' fill='${b}'/><circle cx='20' cy='240' r='4' fill='${a}'/>`,
          260,
          260,
        ),
        "260px 260px",
      );
    case "halftone":
      return tile(`radial-gradient(${a}55 22%, transparent 24%)`, "18px 18px");
    case "grid":
      return { image: `linear-gradient(to bottom, transparent 55%, ${a}44 100%), linear-gradient(${a}38 1px, transparent 1px), linear-gradient(90deg, ${b}33 1px, transparent 1px)`, size: "auto, 44px 44px, 44px 44px", repeat: "repeat", position: "0 0", attach: "fixed" };
    case "stars":
      return { image: `radial-gradient(ellipse at 72% 18%, ${a}55, transparent 52%), ${svg(`<g fill='#ffffff'><circle cx='20' cy='30' r='1.2' opacity='.8'/><circle cx='90' cy='12' r='1' opacity='.6'/><circle cx='160' cy='50' r='1.5' opacity='.9'/><circle cx='60' cy='110' r='1' opacity='.5'/><circle cx='200' cy='140' r='1.1' opacity='.7'/><circle cx='130' cy='180' r='.9' opacity='.5'/><circle cx='30' cy='190' r='1.3' opacity='.7'/></g>`, 220, 220)}`, size: "auto, 220px 220px", repeat: "repeat", position: "0 0", attach: "fixed" };
    case "skyline":
      return {
        image: `radial-gradient(circle at 88% 96px, ${y} 0 44px, ${y}29 45px 84px, transparent 85px), ${svg(`<g fill='${mix(c.pageBg, "#000000", 0.45)}'><rect x='0' y='100' width='30' height='70'/><rect x='30' y='70' width='28' height='100'/><rect x='78' y='45' width='34' height='125'/><rect x='138' y='65' width='22' height='105'/><rect x='190' y='30' width='20' height='140'/><rect x='210' y='80' width='40' height='90'/><rect x='274' y='60' width='30' height='110'/><rect x='304' y='95' width='36' height='75'/><rect x='340' y='75' width='26' height='95'/><rect x='366' y='110' width='34' height='60'/></g><g fill='${y}' opacity='.75'><rect x='86' y='60' width='5' height='7'/><rect x='38' y='88' width='5' height='7'/><rect x='218' y='96' width='5' height='7'/><rect x='282' y='76' width='5' height='7'/></g>`, 400, 170)}`,
        size: "auto, 400px 170px",
        repeat: "no-repeat, repeat-x",
        position: "0 0, left bottom",
        attach: "fixed",
      };
    case "plaid":
      return tile(`repeating-linear-gradient(0deg, ${a}29 0 18px, transparent 18px 46px), repeating-linear-gradient(90deg, ${b}24 0 18px, transparent 18px 46px), repeating-linear-gradient(0deg, ${k}1a 0 2px, transparent 2px 23px)`, "auto");
    case "stripes":
      return tile(`repeating-linear-gradient(-45deg, transparent 0 22px, ${a}33 22px 44px, transparent 44px 66px, ${b}33 66px 88px)`, "auto");
    case "sunset":
      return { image: `linear-gradient(180deg, ${y}66 0 18%, ${a}55 18% 36%, ${b}44 36% 54%, transparent 54%)`, size: "auto", repeat: "no-repeat", position: "0 0", attach: "fixed" };
    case "waves":
      return tile(svg(`<path d='M0 30 q25 -20 50 0 t50 0 t50 0 t50 0' fill='none' stroke='${b}' stroke-width='5' opacity='.45'/><path d='M0 70 q25 -20 50 0 t50 0 t50 0 t50 0' fill='none' stroke='${a}' stroke-width='4' opacity='.3'/>`, 200, 90), "200px 90px");
    case "zigzag":
      return tile(`linear-gradient(135deg, ${a}40 25%, transparent 25%), linear-gradient(225deg, ${b}40 25%, transparent 25%), linear-gradient(315deg, ${y}40 25%, transparent 25%), linear-gradient(45deg, ${a}40 25%, transparent 25%)`, "60px 60px");
    case "polka":
      return tile(`radial-gradient(${a}33 18%, transparent 20%), radial-gradient(${b}2e 18%, transparent 20%)`, "40px 40px");
    case "scanlines":
      return { image: `repeating-linear-gradient(0deg, ${b}1f 0 2px, transparent 2px 5px), radial-gradient(ellipse at 50% 30%, ${a}33, transparent 60%)`, size: "auto", repeat: "repeat", position: "0 0", attach: "fixed" };
    case "sparkle":
      return tile(svg(`<g fill='${y}'><path d='M30 10 l3 9 9 3 -9 3 -3 9 -3 -9 -9 -3 9 -3z' opacity='.8'/><path d='M120 70 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z' opacity='.6'/><circle cx='80' cy='130' r='2' opacity='.7'/><circle cx='150' cy='20' r='1.5' opacity='.6'/></g>`, 180, 160), "180px 160px");
    case "splat":
      return tile(svg(`<g fill='${b}' opacity='.5'><path d='M40 20 c20 -10 40 5 30 25 c-5 10 -25 15 -35 5 c-10 -10 -10 -25 5 -30z'/><rect x='52' y='44' width='6' height='26' rx='3'/><circle cx='55' cy='74' r='5'/></g><g fill='${a}' opacity='.35'><path d='M150 110 c15 -8 32 4 24 20 c-4 8 -20 12 -28 4 c-8 -8 -8 -20 4 -24z'/></g>`, 220, 180), "220px 180px");
    case "pixels":
      return tile(svg(`<rect x='10' y='10' width='10' height='10' fill='${a}' opacity='.6'/><rect x='80' y='30' width='10' height='10' fill='${b}' opacity='.6'/><rect x='40' y='80' width='10' height='10' fill='${y}' opacity='.6'/><rect x='110' y='100' width='10' height='10' fill='${a}' opacity='.4'/><rect x='20' y='120' width='10' height='10' fill='${b}' opacity='.4'/>`, 140, 140), "140px 140px");
    case "graph":
      return tile(`linear-gradient(${b}2e 1px, transparent 1px), linear-gradient(90deg, ${b}2e 1px, transparent 1px), linear-gradient(${b}14 1px, transparent 1px), linear-gradient(90deg, ${b}14 1px, transparent 1px)`, "60px 60px, 60px 60px, 12px 12px, 12px 12px");
  }
}

/** CSS custom properties for a spec vibe; consumed by globals.css. */
export function specStyle(spec: VibeSpec): Record<string, string> {
  const c = safeColors(spec.colors);
  const p = patternCss(spec.pattern, c);
  const navText = readable(c.navBg);
  const navLogo = contrast(c.accent3, c.navBg) >= 3 ? c.accent3 : contrast(c.accent, c.navBg) >= 3 ? c.accent : navText;
  const logo = contrast(c.accent, "#ffffff") >= 3 ? c.accent : darkenFor(c.accent, 3);
  return {
    "--page-bg": c.pageBg,
    "--soft-bg": c.softBg,
    "--bg": c.softBg,
    "--card": "#ffffff",
    "--text": c.ink,
    "--ink": c.ink,
    "--muted": mix(c.ink, "#ffffff", 0.35),
    "--line": mix(c.ink, "#ffffff", 0.84),
    "--pink": c.accent,
    "--on-accent": readable(c.accent),
    "--teal": c.accent2,
    "--on-teal": readable(c.accent2),
    "--yellow": c.accent3,
    "--purple": c.link,
    "--accent-soft": mix(c.accent, "#ffffff", 0.88),
    "--led": c.led,
    "--led-bg": c.ledBg,
    "--led-glow": `${c.led}b3`,
    "--display": FONTS[spec.font]?.css ?? FONTS.bungee.css,
    "--display-transform": FONTS[spec.font]?.upper ? "uppercase" : "none",
    "--logo-color": logo,
    "--nav-bg": c.navBg,
    "--nav-text": navText,
    "--nav-logo": navLogo,
    "--page-pattern": p.image,
    "--page-pattern-size": p.size,
    "--page-repeat": p.repeat,
    "--page-position": p.position,
    "--page-attach": p.attach,
    "--info-pattern": `radial-gradient(${c.accent2}22 20%, transparent 22%)`,
    "--info-size": "10px 10px",
    "--radius": `${Math.max(0, Math.min(16, spec.radius ?? 6))}px`,
  };
}
