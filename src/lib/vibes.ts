/**
 * Page "vibes": original looks inspired by the feel of 80s and 90s TV.
 * They capture a mood (color, texture, type) only. Never use a show's name,
 * logo, characters or catchphrases in a vibe, so every look stays original.
 */

export type VibeId = "mall" | "night-patrol" | "saturday" | "neon-drive" | "sitcom" | "space";

export interface Vibe {
  id: VibeId;
  name: string;
  /** Shown to the owner when choosing, not to guests. */
  blurb: string;
  /** Small sticker on the booking page. */
  tagline: string;
  pick: string;
  done: string;
  /** Swatch colors for the picker. */
  swatch: [string, string, string];
}

export const VIBES: Record<VibeId, Vibe> = {
  mall: {
    id: "mall",
    name: "Mall Rat",
    blurb: "Pastel confetti, chunky outlines and a clock-radio glow. The classic PlayDate look.",
    tagline: "Like ringing the landline, minus the busy signal.",
    pick: "Pick a time to come over",
    done: "It's a play date!",
    swatch: ["#ff2e88", "#00a7a7", "#ffc926"],
  },
  "night-patrol": {
    id: "night-patrol",
    name: "Night Patrol",
    blurb: "Midnight purple, a full moon over the city and comic-book captions. For fans of caped capers.",
    tagline: "Send up the signal. I'll be there.",
    pick: "Pick your moment",
    done: "Signal received!",
    swatch: ["#7b3fc4", "#22b5a6", "#f4c84a"],
  },
  saturday: {
    id: "saturday",
    name: "Saturday Morning",
    blurb: "Bold outlines, primary colors and halftone dots, like the cartoons before noon.",
    tagline: "Grab a bowl of cereal and pick a time.",
    pick: "Pick a time",
    done: "It's on the calendar!",
    swatch: ["#e5322d", "#1e6fd9", "#ffd500"],
  },
  "neon-drive": {
    id: "neon-drive",
    name: "Night Drive",
    blurb: "Black and chrome, a neon grid and a red glow. For fans of fast cars and late-night TV.",
    tagline: "The road is clear. Pick a time.",
    pick: "Pick a time",
    done: "You're locked in.",
    swatch: ["#ff2a3d", "#00e5ff", "#c0c4cc"],
  },
  sitcom: {
    id: "sitcom",
    name: "Living Room",
    blurb: "Mustard, orange and a plaid couch. Warm, family-sitcom energy.",
    tagline: "Come on in, the door's open.",
    pick: "Pick a time to drop by",
    done: "See you at the house!",
    swatch: ["#d9622b", "#4f7a3a", "#e8b93a"],
  },
  space: {
    id: "space",
    name: "Space Age",
    blurb: "Deep blue, starfields and a chrome glow. For sci-fi fans.",
    tagline: "Set the coordinates.",
    pick: "Pick a time",
    done: "Course locked in.",
    swatch: ["#3d7bff", "#9ff3ff", "#ffb547"],
  },
};

export const VIBE_IDS = Object.keys(VIBES) as VibeId[];
export const isVibe = (v: unknown): v is VibeId => typeof v === "string" && v in VIBES;
export const vibeOrDefault = (v: unknown): VibeId => (isVibe(v) ? v : "mall");

// Keywords are matched against the lowercased answer. Longer, more specific
// entries come first within each vibe; the first vibe with a hit wins.
const MATCHERS: [VibeId, string[]][] = [
  ["night-patrol", ["darkwing", "batman", "gargoyles", "spawn", "x-files", "twin peaks", "tales from the crypt", "are you afraid of the dark", "goosebumps", "scooby", "zorro", "the shadow", "dick tracy", "beetlejuice", "addams"]],
  ["neon-drive", ["knight rider", "miami vice", "airwolf", "a-team", "a team", "magnum", "macgyver", "street hawk", "tron", "max headroom", "21 jump street", "fall guy", "dukes of hazzard", "chips", "simon & simon", "moonlighting", "baywatch nights", "street sharks", "m.a.s.k", "mask"]],
  ["space", ["star trek", "battlestar", "buck rogers", "babylon 5", "quantum leap", "lost in space", "stargate", "red dwarf", "jetsons", "captain power", "silverhawks", "galaxy rangers", "visionaries", "starcom", "dr. who", "doctor who", "space cases", "the v ", "alien nation", "farscape", "mystery science"]],
  ["sitcom", ["full house", "family ties", "cosby", "cheers", "golden girls", "growing pains", "who's the boss", "whos the boss", "seinfeld", "friends", "fresh prince", "home improvement", "roseanne", "wonder years", "family matters", "married with children", "married... with children", "alf", "perfect strangers", "frasier", "boy meets world", "step by step", "night court", "newhart", "facts of life", "diff'rent strokes", "different strokes", "webster", "mama's family", "designing women", "murphy brown", "wings", "martin", "living single", "sister, sister", "sister sister", "everybody loves raymond", "king of the hill", "the simpsons", "simpsons"]],
  ["mall", ["saved by the bell", "90210", "fame", "punky brewster", "clarissa", "california dreams", "degrassi", "blossom", "sweet valley", "dawson", "my so-called life", "kids incorporated", "jem", "square pegs", "parker lewis", "head of the class", "mtv", "all that", "kenan", "salute your shorts", "hey dude", "the adventures of pete", "pete & pete", "sabrina", "7th heaven", "beverly hills"]],
  ["saturday", ["ninja turtles", "tmnt", "thundercats", "he-man", "he man", "she-ra", "she ra", "transformers", "g.i. joe", "gi joe", "smurfs", "care bears", "ducktales", "duck tales", "rescue rangers", "chip 'n dale", "chip n dale", "talespin", "tale spin", "animaniacs", "tiny toons", "rugrats", "doug", "ren & stimpy", "ren and stimpy", "pinky and the brain", "muppet babies", "inspector gadget", "captain planet", "power rangers", "sonic", "mario", "x-men", "spider-man", "spiderman", "voltron", "gummi", "ghostbusters", "alvin", "garfield", "looney", "bugs bunny", "pee-wee", "pee wee", "reading rainbow", "fraggle", "my little pony", "strawberry shortcake", "rainbow brite", "dinosaurs", "bobby's world", "rocko", "hey arnold", "dexter", "powerpuff", "johnny bravo", "cartoon"]],
];

/** Closest vibe for a favorite show, or null when there is no match. */
export function matchVibe(show: string): VibeId | null {
  const s = ` ${show.toLowerCase().replace(/\s+/g, " ").trim()} `;
  if (s.trim().length < 2) return null;
  for (const [vibe, words] of MATCHERS) {
    if (words.some((w) => s.includes(w))) return vibe;
  }
  return null;
}
