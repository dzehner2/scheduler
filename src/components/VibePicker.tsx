import { VIBES, VIBE_IDS, type VibeId } from "@/lib/vibes";
import { saveVibe } from "@/app/dashboard/actions";

/** Radio grid of vibes with swatches. Works without JavaScript. */
export default function VibePicker({ current, next, button = "Save vibe" }: { current: VibeId; next?: string; button?: string }) {
  return (
    <form action={saveVibe} className="stack">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="vibe-grid" role="radiogroup" aria-label="Page vibe">
        {VIBE_IDS.map((id) => {
          const v = VIBES[id];
          return (
            <label key={id} className="vibe-option">
              <input type="radio" name="vibe" value={id} defaultChecked={id === current} />
              <span className="vibe-swatch" aria-hidden="true">
                {v.swatch.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <strong>{v.name}</strong>
              <span className="small muted">{v.blurb}</span>
            </label>
          );
        })}
      </div>
      <div>
        <button className="btn">{button}</button>
      </div>
    </form>
  );
}
