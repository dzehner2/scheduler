/**
 * Personal touches for booking links. All are opt-in and research-backed.
 * Guests see friendly wording only; sources are shown to the link owner.
 */

export type TouchId = "mood" | "common" | "note" | "goal" | "walk";

export interface Touch {
  id: TouchId;
  title: string;
  /** What it does, in plain words (owner screen). */
  what: string;
  /** Why it works, one line (owner screen). */
  why: string;
  source: string;
}

export const TOUCHES: Touch[] = [
  {
    id: "mood",
    title: "Mood check-in",
    what: 'Guests can answer "How are you feeling today?" and get a small, practical tip. Their answer stays on their screen and is never saved.',
    why: "Putting feelings into words can take the edge off stress, and small actions like slow breathing or a short walk help.",
    source: "Lieberman et al., Psychological Science, 2007; Zaccaro et al., 2018",
  },
  {
    id: "common",
    title: "Common ground",
    what: "Share something about you, like your favorite sports team, and guests can share theirs. You'll see their answer with the booking.",
    why: "People warm up faster when they discover things they have in common.",
    source: "Byrne, The Attraction Paradigm, 1971; Montoya, Horton & Kirchner, 2008",
  },
  {
    id: "note",
    title: "Welcome note",
    what: "A short, friendly note from you at the top of your booking page.",
    why: "Warmth is the first thing people pick up on when they meet someone new.",
    source: "Fiske, Cuddy & Glick, Trends in Cognitive Sciences, 2007",
  },
  {
    id: "goal",
    title: "Meeting goal",
    what: 'Guests can answer "What would make this time great for you?" You\'ll see it with the booking, so you both come prepared.',
    why: "Meetings with a clear purpose go better, and naming a specific goal makes follow-through more likely.",
    source: "Leach et al., Small Group Research, 2009; Gollwitzer, 1999",
  },
  {
    id: "walk",
    title: "Walk-and-talk",
    what: "Guests can tick \"I'm up for a walking call\" so you can take the meeting on foot.",
    why: "People come up with noticeably more ideas while walking than while sitting.",
    source: "Oppezzo & Schwartz, Journal of Experimental Psychology, 2014",
  },
];

export const COMMON_PROMPTS = [
  "Favorite sports team",
  "Favorite band or artist",
  "Favorite place you've traveled",
  "Favorite book or podcast",
  "Go-to coffee order",
];

export const MAX_NOTE = 400;
export const MAX_ANSWER = 120;
export const MAX_GOAL = 300;

/** Loose match for "you both picked the same thing" (case, spaces, punctuation, a leading "the"). */
export function sameAnswer(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/^the /, "");
  return !!norm(a) && norm(a) === norm(b);
}
