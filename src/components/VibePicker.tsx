import { saveVibe } from "@/app/dashboard/actions";
import { FONTS } from "@/lib/vibeKit";
import type { ResolvedVibe } from "@/lib/vibeResolve";
import { VIBES, VIBE_IDS } from "@/lib/vibes";

/** Radio grid of vibes with swatches and font samples. Works without JavaScript. */
export default function VibePicker({
  current,
  custom,
  next,
  button = "Save vibe",
}: {
  current: string;
  /** The user's own AI-designed vibe, if they have one. */
  custom?: ResolvedVibe | null;
  next?: string;
  button?: string;
}) {
  const options = [
    ...(custom ? [{ key: custom.key, name: custom.name, blurb: custom.blurb, swatch: custom.swatch, font: custom.style["--display"], madeForYou: true }] : []),
    ...VIBE_IDS.map((id) => {
      const v = VIBES[id];
      return { key: id as string, name: v.name, blurb: v.blurb, swatch: v.swatch, font: v.spec ? FONTS[v.spec.font].css : undefined, madeForYou: false };
    }),
  ];
  return (
    <form action={saveVibe} className="stack">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="vibe-grid" role="radiogroup" aria-label="Page vibe">
        {options.map((o) => (
          <label key={o.key} className={`vibe-option${o.madeForYou ? " made-for-you" : ""}`}>
            <input type="radio" name="vibe" value={o.key} defaultChecked={o.key === current} />
            {o.madeForYou && <span className="badge ok">Made for you</span>}
            <span className="vibe-swatch" aria-hidden="true">
              {o.swatch.map((c, i) => (
                <i key={`${c}${i}`} style={{ background: c }} />
              ))}
            </span>
            <strong style={o.font ? { fontFamily: o.font, fontWeight: 400 } : undefined}>{o.name}</strong>
            <span className="small muted">{o.blurb}</span>
          </label>
        ))}
      </div>
      <div>
        <button className="btn">{button}</button>
      </div>
    </form>
  );
}
