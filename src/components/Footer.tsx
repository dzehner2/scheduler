import Link from "next/link";

export default function Footer({ plain = false }: { plain?: boolean }) {
  return (
    <footer className="container footer">
      <div className="footer-pill">
        {!plain && (
          <>
            <Link href="/">PlayDate</Link> ·{" "}
          </>
        )}
        <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/footprint">Footprint</Link>
        {!plain && <div className="rewind">Be kind, rewind.</div>}
      </div>
    </footer>
  );
}
