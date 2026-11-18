import type { Metadata } from "next";
import BookPage, { bookPageTitle } from "@/components/BookPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: await bookPageTitle(null, (await params).slug) };
}

export default async function RootLinkPage({ params }: Props) {
  return <BookPage handle={null} slug={(await params).slug} />;
}
