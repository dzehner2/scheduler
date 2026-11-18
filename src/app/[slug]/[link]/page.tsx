import type { Metadata } from "next";
import BookPage, { bookPageTitle } from "@/components/BookPage";

export const dynamic = "force-dynamic";

// /handle/link: a booking link belonging to a PlayDate user.
type Props = { params: Promise<{ slug: string; link: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  return { title: await bookPageTitle(p.slug, p.link) };
}

export default async function UserLinkPage({ params }: Props) {
  const p = await params;
  return <BookPage handle={p.slug} slug={p.link} />;
}
