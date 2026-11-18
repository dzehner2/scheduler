import { notFound } from "next/navigation";
import ManageBooking from "@/components/ManageBooking";
import { getBooking, tokenMatches } from "@/lib/booking";
import { linkPathFor } from "@/lib/users";
import { brandingFor, brandStyle, getEventType, getSettings } from "@/lib/eventTypes";
import { vibeOrDefault } from "@/lib/vibes";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  const b = await getBooking(id);
  if (!b || !tokenMatches(b, t)) notFound();
  const type = b.event_type_id ? await getEventType(b.event_type_id) : null;
  const brand = type ? brandingFor(type) : null;
  const branded = brand?.theme === "brand";
  const vibe = vibeOrDefault((await getSettings(b.user_id)).vibe);
  return (
    <div className={branded ? "theme-brand" : `vibe-page vibe-${vibe}`} style={(brand ? brandStyle(brand) : {}) as React.CSSProperties}>
    <main className="container narrow">
      <ManageBooking
        id={b.id}
        token={t!}
        title={b.event_title}
        start={b.start_at.toISOString()}
        cancelled={b.status !== "confirmed"}
        past={b.start_at < new Date()}
        rebookPath={type?.active ? await linkPathFor(type.user_id, type.slug) : null}
        branded={branded}
      />
    </main>
    </div>
  );
}
