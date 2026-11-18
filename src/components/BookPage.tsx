import { notFound } from "next/navigation";
import BookingWidget from "@/components/BookingWidget";
import Footer from "@/components/Footer";
import { vibeOrDefault } from "@/lib/vibes";
import { recordUsage } from "@/lib/usage";
import { brandingFor, brandStyle, getEventTypeBySlug, getSettings, locationLabel } from "@/lib/eventTypes";

/** Public booking page, shared by /slug (primary owner) and /handle/slug (everyone else). */
export async function bookPageTitle(handle: string | null, slug: string): Promise<string> {
  const t = await getEventTypeBySlug(handle, slug);
  if (!t?.active) return "Not found";
  const b = brandingFor(t);
  return b.theme === "brand" && b.name ? `${t.title} | ${b.name}` : t.title;
}

export default async function BookPage({ handle, slug }: { handle: string | null; slug: string }) {
  const t = await getEventTypeBySlug(handle, slug);
  if (!t || !t.active) notFound();
  const s = await getSettings(t.user_id);
  await recordUsage(t.user_id, "page");
  const b = brandingFor(t);
  const branded = b.theme === "brand";
  return (
    <div
      className={branded ? "theme-brand" : `vibe-page vibe-${vibeOrDefault(s.vibe)}`}
      style={brandStyle(b) as React.CSSProperties}
    >
      <main className="container">
        <BookingWidget
          handle={handle}
          slug={t.slug}
          title={t.title}
          description={t.description}
          hostName={s.display_name}
          durationMin={t.duration_min}
          location={locationLabel(t)}
          needsPhone={t.location_type === "phone"}
          maxDaysAhead={t.max_days_ahead}
          branded={branded}
          brandName={b.name}
          logoUrl={b.logoUrl}
          vibe={vibeOrDefault(s.vibe)}
          askFeeling={t.personal_mood === true}
          personal={{
            note: t.personal_note,
            common: t.personal_common && t.common_prompt && t.common_host_answer ? { prompt: t.common_prompt, hostAnswer: t.common_host_answer } : null,
            goal: t.personal_goal,
            walk: t.personal_walk,
          }}
        />
      </main>
      <Footer plain={branded} />
    </div>
  );
}
