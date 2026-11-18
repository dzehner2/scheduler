import VibePicker from "@/components/VibePicker";
import { getSettings } from "@/lib/eventTypes";
import { requireUser } from "@/lib/session";
import { VIBES, vibeOrDefault } from "@/lib/vibes";
import { saveFavoriteShow } from "../actions";

export default async function Welcome({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; nomatch?: string; error?: string }>;
}) {
  const { step, nomatch, error } = await searchParams;
  const me = await requireUser();
  const s = await getSettings(me.id);
  const vibe = vibeOrDefault(s.vibe);

  if (step === "vibe" && s.favorite_show) {
    return (
      <div className="card stack hero">
        <h1>{nomatch ? "Great pick. Choose your vibe" : `Your vibe: ${VIBES[vibe].name}`}</h1>
        <p>
          {nomatch
            ? `We don't have a look made for ${s.favorite_show} yet, so pick the one that feels closest.`
            : `Inspired by your love of ${s.favorite_show}. Your booking pages and dashboard now use it. Prefer another? Switch below; you can change it any time in Calendars and settings.`}
        </p>
        <p className="small muted">
          Vibes capture a feel, not a show: you won&apos;t see any show names, logos or characters on your pages.
        </p>
        <VibePicker current={vibe} next="welcome" button="Looks good, keep going" />
      </div>
    );
  }

  return (
    <div className="card stack hero">
      <h1>One question before we start</h1>
      <p className="lead">What&apos;s your favorite &apos;80s or &apos;90s show or cartoon?</p>
      <p className="muted">We&apos;ll style your booking pages around its vibe. Guests never see the show&apos;s name.</p>
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
        </div>
      </form>
    </div>
  );
}
