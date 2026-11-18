import Link from "next/link";

export default function Footer() {
  return (
    <footer className="container small muted" style={{ paddingTop: 0, textAlign: "center" }}>
      <Link href="/">PlayDate</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
    </footer>
  );
}
