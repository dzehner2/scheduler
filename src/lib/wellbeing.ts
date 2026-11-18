/**
 * Small, science-backed wellbeing tips. These are friendly suggestions, not
 * medical advice. Each cites the research it draws on.
 */

export interface Tip {
  text: string;
  source: string;
}

// ---------- Guest: "How are you feeling today?" ----------
// Answers are used only in the guest's browser to pick a tip. Never stored or sent.

export type Feeling = "great" | "good" | "okay" | "tired" | "stressed" | "struggling";

export const FEELINGS: { id: Feeling; label: string }[] = [
  { id: "great", label: "Great" },
  { id: "good", label: "Good" },
  { id: "okay", label: "Okay" },
  { id: "tired", label: "Tired" },
  { id: "stressed", label: "Stressed" },
  { id: "struggling", label: "Really struggling" },
];

export const GUEST_TIPS: Record<Feeling, Tip> = {
  great: {
    text: "Got energy to spare? Suggest making it a walking call. People came up with noticeably more creative ideas while walking than while sitting.",
    source: "Oppezzo & Schwartz, Journal of Experimental Psychology, 2014",
  },
  good: {
    text: "Before you meet, jot down the one thing you most want out of this conversation. Writing a specific plan makes follow-through more likely.",
    source: "Gollwitzer, American Psychologist, 1999",
  },
  okay: {
    text: "Take a few minutes outside or by a window before the call. Time in nature helps restore attention.",
    source: "Berman, Jonides & Kaplan, Psychological Science, 2008",
  },
  tired: {
    text: "Pick a shorter slot if one works, and have a glass of water nearby. Even mild dehydration can lower mood and focus.",
    source: "Armstrong et al., Journal of Nutrition, 2012",
  },
  stressed: {
    text: "Try a minute of slow breathing before you join: in for 4, out for 6. Slow breathing is linked to a calmer stress response.",
    source: "Zaccaro et al., Frontiers in Human Neuroscience, 2018",
  },
  struggling: {
    text: "It is completely okay to pick a later day, or to reach out to someone you trust. You do not have to push through alone.",
    source: "If you are in the US and need support now, call or text 988 (Suicide & Crisis Lifeline).",
  },
};

// ---------- Host: private daily check-in ----------

export type Scale = 1 | 2 | 3 | 4 | 5;

export interface CheckIn {
  energy: Scale; // 1 drained ... 5 energized
  stress: Scale; // 1 calm ... 5 very stressed
  mood: Scale; // 1 low ... 5 great
}

export const isScale = (n: unknown): n is Scale => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5;

/** One tip for the host, picked from their own answers. Most pressing need first. */
export function hostTip(c: CheckIn): Tip {
  if (c.mood <= 1 && c.stress >= 4) {
    return {
      text: "Rough day. Move what you can, and reach out to someone you trust. If you are in the US and need support now, call or text 988.",
      source: "988 Suicide & Crisis Lifeline",
    };
  }
  if (c.stress >= 4) {
    return {
      text: "Stress is high. Give yourself a 10 minute gap between meetings today and take a few slow breaths (in for 4, out for 6) before each one.",
      source: "Zaccaro et al., Frontiers in Human Neuroscience, 2018",
    };
  }
  if (c.energy <= 2) {
    return {
      text: "Energy is low. Keep calls short today, take one standing or walking, and have water handy.",
      source: "Oppezzo & Schwartz, 2014; Armstrong et al., 2012",
    };
  }
  if (c.mood <= 2) {
    return {
      text: "Mood is low. Plan a short walk outside today, ideally with someone you like talking to. Nature and social contact both lift mood.",
      source: "Bratman et al., PNAS, 2015; Sandstrom & Dunn, Personality and Social Psychology Bulletin, 2014",
    };
  }
  if (c.energy >= 4 && c.stress <= 2) {
    return {
      text: "You are in a good spot. Protect a block of focus time today for the work that matters most, before the calendar fills up.",
      source: "Mark, Gudith & Klocke, CHI, 2008",
    };
  }
  return {
    text: "A steady day. Write down your top one or two priorities, and end the day by noting one thing that went well.",
    source: "Seligman et al., American Psychologist, 2005",
  };
}
