import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingWidget from "@/components/BookingWidget";
import { getEventTypeBySlug, getSettings, locationLabel } from "@/lib/eventTypes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getEventTypeBySlug((await params).slug);
  return { title: t?.active ? t.title : "Not found" };
}

export default async function BookPage({ params }: Props) {
  const t = await getEventTypeBySlug((await params).slug);
  if (!t || !t.active) notFound();
  const s = await getSettings();
  return (
    <main className="container">
      <BookingWidget
        slug={t.slug}
        title={t.title}
        description={t.description}
        hostName={s.display_name}
        durationMin={t.duration_min}
        location={locationLabel(t)}
        needsPhone={t.location_type === "phone"}
        maxDaysAhead={t.max_days_ahead}
      />
    </main>
  );
}
