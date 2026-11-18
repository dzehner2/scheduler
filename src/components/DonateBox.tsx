import { DONATE, fmtCents, roundUpToTrees } from "@/lib/footprint";

export default function DonateBox({ cents, who }: { cents: number; who: "you" | "app" }) {
  const { trees, dollars } = roundUpToTrees(cents);
  return (
    <div className="donate stack">
      <p style={{ margin: 0 }}>
        <strong>Suggested donation: {fmtCents(cents)}</strong>{" "}
        {who === "you" ? "covers your estimated share." : "covers the whole app so far."} Round up to ${dollars} and{" "}
        {DONATE.name} plants {trees} {trees === 1 ? "tree" : "trees"}.
      </p>
      <div>
        <a className="btn" href={DONATE.url} target="_blank" rel="noopener noreferrer">
          Donate to {DONATE.name}
        </a>
      </div>
    </div>
  );
}
