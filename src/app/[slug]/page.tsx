import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingWidget from "@/components/BookingWidget";
import Footer from "@/components/Footer";
import { brandingFor, brandStyle, getEventTypeBySlug, getSettings, locationLabel } from "@/lib/eventTypes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getEventTypeBySlug((await params).slug);
  if (!t?.active) return { title: "Not found" };
  const b = brandingFor(t);
  return { title: b.theme === "brand" && b.name ? `${t.title} | ${b.name}` : t.title };
}

export default async function BookPage({ params }: Props) {
  const t = await getEventTypeBySlug((await params).slug);
  if (!t || !t.active) notFound();
  const s = await getSettings();
  const b = brandingFor(t);
  const branded = b.theme === "brand";
  return (
    <div className={branded ? "theme-brand" : undefined} style={brandStyle(b) as React.CSSProperties}>
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
          branded={branded}
          brandName={b.name}
          logoUrl={b.logoUrl}
        />
      </main>
      <Footer plain={branded} />
    </div>
  );
}
