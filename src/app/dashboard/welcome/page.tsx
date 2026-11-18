import VibePicker from "@/components/VibePicker";
import { getSettings } from "@/lib/eventTypes";
import { requireUser } from "@/lib/session";
import { designerEnabled } from "@/lib/vibeDesigner";
import { resolveVibe } from "@/lib/vibeResolve";
import { saveFavoriteShow } from "../actions";

// Designing a new vibe calls Claude, which can take several seconds.
export const maxDuration = 60;

export default async function Welcome({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; outcome?: string; error?: string }>;
}) {
  const { step, outcome, error } = await searchParams;
  const me = await requireUser();
  const s = await getSettings(me.id);
  const vibe = await resolveVibe(s.vibe);
  const custom = s.custom_vibe ? await resolveVibe(s.custom_vibe) : null;

  if (step === "vibe" && s.favorite_show) {
    const heading =
      outcome === "designed"
        ? `We made you a new vibe: ${vibe.name}`
        : outcome === "nomatch"
          ? "Great pick. Choose your vibe"
          : `Your vibe: ${vibe.name}`;
    const intro =
      outcome === "designed"
        ? `Nothing in our collection quite fit ${s.favorite_show}, so we designed a one-of-a-kind look around it: its colors, lettering and textures.`
        : outcome === "nomatch"
          ? `We couldn't design a look for ${s.favorite_show} right now, so pick the one that feels closest.`
          : `Inspired by your love of ${s.favorite_show}.`;
    return (
      <div className="card stack hero">
        <h1>{heading}</h1>
        <p>{intro} It styles your booking pages and this dashboard. You can change it any time in Calendars and settings.</p>
        {outcome !== "nomatch" && (
          <div className={`vibe-preview ${vibe.className}`} style={vibe.style as React.CSSProperties}>
            <div className="vibe-preview-card">
              <div className="vibe-preview-title">{vibe.name}</div>
              <p className="tagline" style={{ margin: "8px 0" }}>{vibe.tagline}</p>
              <div className="row" style={{ gap: 8 }}>
                <span className="time">10:30 AM</span>
                <span className="btn small">{vibe.pick}</span>
              </div>
            </div>
          </div>
        )}
        <p className="small muted">
          Vibes capture a feel, not a show: guests never see show names, logos or characters.
        </p>
        <VibePicker current={vibe.key} custom={custom} next="welcome" button="Looks good, keep going" />
      </div>
    );
  }

  return (
    <div className="card stack hero">
      <h1>One question before we start</h1>
      <p className="lead">What&apos;s your favorite &apos;80s or &apos;90s show or cartoon?</p>
      <p className="muted">
        We&apos;ll style your booking pages around its vibe
        {designerEnabled() ? ", and if it's not in our collection we'll design a new look just for it" : ""}. Guests
        never see the show&apos;s name.
      </p>
      {error && <div className="alert error">{error}</div>}
      <form action={saveFavoriteShow} className="stack">
        <div>
          <label htmlFor="favorite_show">Favorite show or cartoon</label>
          <input
            id="favorite_show"
            name="favorite_show"
            type="text"
            required
            maxLength={120}
            defaultValue={s.favorite_show}
            placeholder="Saturday cartoons, Thursday sitcoms, late-night reruns..."
            autoFocus
          />
        </div>
        <div>
          <button className="btn">Show me my vibe</button>
          <span className="small muted" style={{ marginLeft: 10 }}>
            New designs take a few seconds.
          </span>
        </div>
      </form>
    </div>
  );
}
