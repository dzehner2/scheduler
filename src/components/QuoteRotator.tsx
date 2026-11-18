"use client";
import { useEffect, useState } from "react";
import { QUOTES } from "@/lib/quotes";

const EVERY_MS = 7000;

export default function QuoteRotator() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    // Start at a random quote; respect reduced-motion by not auto-rotating.
    setI(Math.floor(Math.random() * QUOTES.length));
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  useEffect(() => {
    if (paused || hover) return;
    const t = setInterval(() => setI((n) => (n + 1) % QUOTES.length), EVERY_MS);
    return () => clearInterval(t);
  }, [paused, hover]);

  const q = QUOTES[i];
  return (
    <figure
      className="quote"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <blockquote key={i} className="quote-line">
        &ldquo;{q.line}&rdquo;
      </blockquote>
      <figcaption className="quote-source">{q.source}</figcaption>
      <div className="quote-controls">
        <button type="button" className="linkbtn small" onClick={() => setI((n) => (n + 1) % QUOTES.length)}>
          Another one
        </button>
        <button type="button" className="linkbtn small" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
          {paused ? "Play" : "Pause"}
        </button>
      </div>
    </figure>
  );
}
