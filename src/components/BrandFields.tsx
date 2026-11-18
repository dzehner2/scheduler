"use client";
import { useState } from "react";

interface Brand {
  theme: string;
  name: string;
  primary: string;
  dark: string;
  bg: string;
  logoUrl: string;
}

// Keep in sync with BRAND_PRESETS in src/lib/eventTypes.ts
const PRESETS: Record<string, Omit<Brand, "theme" | "logoUrl">> = {
  CedarStone: { name: "CedarStone Design & Build", primary: "#117A4F", dark: "#1F2D3D", bg: "#F2F6F2" },
};

export default function BrandFields({ initial }: { initial: Brand }) {
  const [b, setB] = useState<Brand>({
    ...initial,
    primary: initial.primary || "#1F6FEB",
    dark: initial.dark || "#1C2430",
    bg: initial.bg || "#F6F7F9",
  });
  const set = (k: keyof Brand) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setB({ ...b, [k]: e.target.value });

  const colorField = (k: "primary" | "dark" | "bg", label: string, hint: string) => (
    <div>
      <label htmlFor={`brand_${k}`}>{label}</label>
      <div className="row" style={{ flexWrap: "nowrap", gap: 8 }}>
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(b[k]) ? b[k] : "#000000"} onChange={set(k)} aria-label={`${label} picker`} style={{ width: 48, height: 42, padding: 2, flex: "none" }} />
        <input id={`brand_${k}`} name={`brand_${k}`} type="text" value={b[k]} onChange={set(k)} maxLength={7} />
      </div>
      <div className="hint">{hint}</div>
    </div>
  );

  return (
    <div className="card stack">
      <h2>Look</h2>
      <div>
        <label htmlFor="theme">Style of the booking page</label>
        <select id="theme" name="theme" value={b.theme} onChange={set("theme")}>
          <option value="playdate">PlayDate (1980s)</option>
          <option value="brand">Company branding</option>
        </select>
        <div className="hint">Company branding uses your colors and logo, with plain business wording.</div>
      </div>

      {b.theme === "brand" ? (
        <>
          <div className="row">
            <span className="small muted">Presets:</span>
            {Object.entries(PRESETS).map(([key, p]) => (
              <button key={key} type="button" className="btn secondary small" onClick={() => setB({ ...b, ...p })}>
                {key}
              </button>
            ))}
          </div>
          <div className="grid2">
            <div>
              <label htmlFor="brand_name">Company name</label>
              <input id="brand_name" name="brand_name" type="text" value={b.name} onChange={set("name")} maxLength={120} />
            </div>
            <div>
              <label htmlFor="brand_logo_url">Logo address (optional)</label>
              <input id="brand_logo_url" name="brand_logo_url" type="text" value={b.logoUrl} onChange={set("logoUrl")} placeholder="https://..." />
              <div className="hint">Link to a PNG or SVG on your website. Right-click your logo there and copy the image address.</div>
            </div>
            {colorField("primary", "Main color", "Buttons and highlights")}
            {colorField("dark", "Text color", "Headings and text")}
            {colorField("bg", "Background color", "Page background")}
          </div>
          <div className="brand-preview" style={{ background: b.bg, color: b.dark }}>
            {b.logoUrl && /^https:\/\//.test(b.logoUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logoUrl} alt="" style={{ maxHeight: 36, maxWidth: 180 }} />
            ) : (
              <strong>{b.name || "Company name"}</strong>
            )}
            <span style={{ background: b.primary, color: "#fff", padding: "6px 12px", borderRadius: 8, fontWeight: 700 }}>
              10:30 AM
            </span>
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="brand_name" value={b.name} />
          <input type="hidden" name="brand_logo_url" value={b.logoUrl} />
          <input type="hidden" name="brand_primary" value={b.primary} />
          <input type="hidden" name="brand_dark" value={b.dark} />
          <input type="hidden" name="brand_bg" value={b.bg} />
        </>
      )}
    </div>
  );
}
