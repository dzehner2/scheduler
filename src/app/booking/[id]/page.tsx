import { notFound } from "next/navigation";
import ManageBooking from "@/components/ManageBooking";
import { getBooking, tokenMatches } from "@/lib/booking";
import { getEventType } from "@/lib/eventTypes";

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
  return (
    <main className="container narrow">
      <ManageBooking
        id={b.id}
        token={t!}
        title={b.event_title}
        start={b.start_at.toISOString()}
        cancelled={b.status !== "confirmed"}
        past={b.start_at < new Date()}
        rebookSlug={type?.active ? type.slug : null}
      />
    </main>
  );
}
