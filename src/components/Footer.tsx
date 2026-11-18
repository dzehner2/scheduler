import Link from "next/link";

export default function Footer() {
  return (
    <footer className="container footer">
      <div className="footer-pill">
      <Link href="/">PlayDate</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
      <div className="rewind">Be kind, rewind.</div>
      </div>
    </footer>
  );
}
