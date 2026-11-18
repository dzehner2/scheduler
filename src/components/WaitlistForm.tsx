"use client";
import { useState } from "react";

export default function WaitlistForm() {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Something went wrong. Please try again.");
        setState("idle");
        return;
      }
      setState("done");
    } catch {
      setError("Network error. Please try again.");
      setState("idle");
    }
  }

  if (state === "done") {
    return <div className="alert ok big">You&apos;re on the list!</div>;
  }

  return (
    <form onSubmit={submit} className="stack">
      {error && <div className="alert error">{error}</div>}
      <div className="grid2">
        <div>
          <label htmlFor="wl-name">Name</label>
          <input id="wl-name" name="name" type="text" required maxLength={120} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="wl-email">Email</label>
          <input id="wl-email" name="email" type="email" required maxLength={200} autoComplete="email" />
        </div>
      </div>
      <div>
        <label htmlFor="wl-use">What would you use it for? (optional)</label>
        <input id="wl-use" name="useCase" type="text" maxLength={500} placeholder="Client calls, kids' play dates, band practice..." />
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="wl-website">Website</label>
        <input id="wl-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <button className="btn" disabled={state === "sending"}>
          {state === "sending" ? "Dialing..." : "Put me on the list"}
        </button>
      </div>
    </form>
  );
}
