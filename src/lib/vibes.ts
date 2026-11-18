/**
 * Page "vibes": original looks inspired by the feel of 80s and 90s TV.
 * They capture a mood (color, texture, type) only. Never use a show's name,
 * logo, characters or catchphrases in a vibe, so every look stays original.
 *
 * The first six are styled by CSS classes in globals.css. The rest are
 * data-driven specs (see vibeKit.ts), the same format AI-designed vibes use.
 */
import type { VibeSpec } from "./vibeKit";

export type ClassVibeId = "mall" | "night-patrol" | "saturday" | "neon-drive" | "sitcom" | "space";
export type SpecVibeId =
  | "arcade"
  | "case-files"
  | "creature-feature"
  | "pastel-vice"
  | "castle-quest"
  | "block-party"
  | "slime-time"
  | "beach-day"
  | "neighborhood"
  | "science-lab";
export type VibeId = ClassVibeId | SpecVibeId;

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
  /** Data-driven look (spec vibes only). */
  spec?: VibeSpec;
}

const spec = (s: Omit<VibeSpec, "id"> & { id: SpecVibeId }): Vibe => ({
  id: s.id,
  name: s.name,
  blurb: s.blurb,
  tagline: s.tagline,
  pick: s.pick,
  done: s.done,
  swatch: [s.colors.accent, s.colors.accent2, s.colors.accent3],
  spec: s,
});

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
  arcade: spec({
    id: "arcade",
    name: "Arcade Cabinet",
    blurb: "8-bit lettering, pixel blocks and neon on black. For video game kids.",
    tagline: "Insert coin. Pick a time.",
    pick: "Select your stage",
    done: "High score! You're booked.",
    font: "press-start",
    pattern: "pixels",
    radius: 2,
    colors: { pageBg: "#0b0b1a", softBg: "#eef0fb", ink: "#14142b", accent: "#ff3cac", accent2: "#2bd9fe", accent3: "#ffe600", link: "#5a2bd6", led: "#39ff14", ledBg: "#0b0b1a", navBg: "#0b0b1a" },
  }),
  "case-files": spec({
    id: "case-files",
    name: "Case Files",
    blurb: "Typewriter type, manila folders and a late-night green glow. For fans of mysteries and the unexplained.",
    tagline: "Some things are worth looking into.",
    pick: "Pick a time to compare notes",
    done: "File opened. See you then.",
    font: "special-elite",
    pattern: "scanlines",
    radius: 2,
    colors: { pageBg: "#17211c", softBg: "#eef2ee", ink: "#16211b", accent: "#3a7d5c", accent2: "#c9a227", accent3: "#e8d9a8", link: "#2f5d46", led: "#7cfc9a", ledBg: "#0f1512", navBg: "#141c18" },
  }),
  "creature-feature": spec({
    id: "creature-feature",
    name: "Creature Feature",
    blurb: "Spooky lettering, slime drips and pumpkin orange. For kids who loved a good scare.",
    tagline: "Come in, if you dare.",
    pick: "Pick a spooky good time",
    done: "Spooky good. You're booked!",
    font: "creepster",
    pattern: "splat",
    colors: { pageBg: "#1a0f24", softBg: "#f2eef6", ink: "#1c1026", accent: "#ff7a00", accent2: "#7ed321", accent3: "#b8e986", link: "#6a1b9a", led: "#7ed321", ledBg: "#120a19", navBg: "#120a19" },
  }),
  "pastel-vice": spec({
    id: "pastel-vice",
    name: "Pastel Vice",
    blurb: "Neon-sign lettering, sunset bands, hot pink and teal. Pastel suits and ocean drives.",
    tagline: "Sunset is calling.",
    pick: "Pick a time",
    done: "Smooth. You're booked.",
    font: "monoton",
    pattern: "sunset",
    radius: 10,
    colors: { pageBg: "#ffd8ea", softBg: "#fff1f7", ink: "#2a1035", accent: "#ff4fa3", accent2: "#23c4c4", accent3: "#ffb36b", link: "#8a2be2", led: "#23c4c4", ledBg: "#2a1035", navBg: "#2a1035" },
  }),
  "castle-quest": spec({
    id: "castle-quest",
    name: "Castle Quest",
    blurb: "Storybook lettering, gold sparkles and royal purple. For fans of heroes, swords and sorcery.",
    tagline: "Your quest begins here.",
    pick: "Choose your hour",
    done: "The quest is set!",
    font: "cinzel",
    pattern: "sparkle",
    colors: { pageBg: "#2b1b4a", softBg: "#f4effb", ink: "#1f1338", accent: "#d4a017", accent2: "#8e44ad", accent3: "#f6d365", link: "#6b2fa0", led: "#f6d365", ledBg: "#1c1233", navBg: "#1c1233" },
  }),
  "block-party": spec({
    id: "block-party",
    name: "Block Party",
    blurb: "Marker lettering, zigzag color blocks and loud pinks and yellows. 90s street style.",
    tagline: "Pull up. The party's on.",
    pick: "Pick a time to pull up",
    done: "You're on the list!",
    font: "permanent-marker",
    pattern: "zigzag",
    colors: { pageBg: "#111111", softBg: "#f4f4f4", ink: "#111111", accent: "#ff2d95", accent2: "#00c2a8", accent3: "#ffd400", link: "#6c2bd9", led: "#ffd400", ledBg: "#111111", navBg: "#111111" },
  }),
  "slime-time": spec({
    id: "slime-time",
    name: "Slime Time",
    blurb: "Bouncy lettering, bright orange and green slime splats. Kids' cable at its loudest.",
    tagline: "Get ready to get slimed.",
    pick: "Pick a time",
    done: "Splat! You're booked.",
    font: "luckiest-guy",
    pattern: "splat",
    colors: { pageBg: "#ff7a00", softBg: "#fff3e6", ink: "#241a33", accent: "#6cc24a", accent2: "#8e3bd6", accent3: "#ffe14d", link: "#6a2bc2", led: "#9cff57", ledBg: "#241a33", navBg: "#241a33" },
  }),
  "beach-day": spec({
    id: "beach-day",
    name: "Beach Day",
    blurb: "Surf-script lettering, ocean waves, coral and sunshine. Sun, sand and lifeguard towers.",
    tagline: "Surf's up. Pick a time.",
    pick: "Pick a time to hang",
    done: "Totally booked!",
    font: "pacifico",
    pattern: "waves",
    radius: 12,
    colors: { pageBg: "#ffe8c2", softBg: "#fff8ec", ink: "#0b3c49", accent: "#ff6b4a", accent2: "#00a6c7", accent3: "#ffd166", link: "#00799a", led: "#ffd166", ledBg: "#0b3c49", navBg: "#0b3c49" },
  }),
  neighborhood: spec({
    id: "neighborhood",
    name: "Cozy Neighborhood",
    blurb: "Soft rounded lettering, polka dots, trolley red and garden green. Gentle, puppets-and-sweaters calm.",
    tagline: "Come on over, the porch light's on.",
    pick: "Pick a time to visit",
    done: "See you soon, neighbor!",
    font: "fredoka",
    pattern: "polka",
    radius: 14,
    colors: { pageBg: "#e9f3e1", softBg: "#f4f9f0", ink: "#22301f", accent: "#d6453d", accent2: "#2e7d32", accent3: "#f2c14e", link: "#1f5fa8", led: "#f2c14e", ledBg: "#2b2b2b", navBg: "#2e5e3e" },
  }),
  "science-lab": spec({
    id: "science-lab",
    name: "Science Lab",
    blurb: "Gadget lettering, graph paper and safety orange. For kids who loved TV experiments.",
    tagline: "Hypothesis: we should meet.",
    pick: "Pick a time to experiment",
    done: "Experiment scheduled!",
    font: "audiowide",
    pattern: "graph",
    colors: { pageBg: "#dff6ff", softBg: "#f1fbff", ink: "#0d1b2a", accent: "#ff5a1f", accent2: "#00a3e0", accent3: "#ffd23f", link: "#0059b3", led: "#39ff14", ledBg: "#0d1b2a", navBg: "#0d1b2a" },
  }),
};

export const VIBE_IDS = Object.keys(VIBES) as VibeId[];
export const isVibe = (v: unknown): v is VibeId => typeof v === "string" && Object.prototype.hasOwnProperty.call(VIBES, v);
export const vibeOrDefault = (v: unknown): VibeId => (isVibe(v) ? v : "mall");

/** "custom:12" refers to an AI-designed vibe stored in the database. */
export const CUSTOM_PREFIX = "custom:";
export const customId = (v: unknown): number | null => {
  if (typeof v !== "string" || !v.startsWith(CUSTOM_PREFIX)) return null;
  const n = Number(v.slice(CUSTOM_PREFIX.length));
  return Number.isInteger(n) && n > 0 ? n : null;
};

// Keywords are matched against the lowercased answer. Specific genres come
// first; the first vibe with a hit wins.
const MATCHERS: [VibeId, string[]][] = [
  ["case-files", ["x-files", "x files", "twin peaks", "unsolved mysteries", "murder, she wrote", "murder she wrote", "columbo", "sightings", "millennium", "law & order", "law and order", "nypd blue", "homicide"]],
  ["creature-feature", ["goosebumps", "are you afraid of the dark", "tales from the crypt", "scooby", "beetlejuice", "addams", "munsters", "real monsters", "eerie, indiana", "eerie indiana", "tales from the darkside", "elvira"]],
  ["night-patrol", ["darkwing", "batman", "gargoyles", "spawn", "zorro", "the shadow", "dick tracy", "the tick", "freakazoid"]],
  ["arcade", ["pac-man", "pacman", "captain n", "super mario", "mario bros", "zelda", "sonic", "street fighter", "mega man", "video power", "nick arcade", "reboot", "pole position", "q*bert", "qbert"]],
  ["pastel-vice", ["miami vice", "golden girls", "moonlighting", "fantasy island", "love boat", "dynasty", "dallas", "falcon crest", "silk stalkings"]],
  ["neon-drive", ["knight rider", "airwolf", "a-team", "a team", "magnum", "macgyver", "street hawk", "tron", "max headroom", "21 jump street", "fall guy", "dukes of hazzard", "chips", "simon & simon", "street sharks", "m.a.s.k", "mask", "automan", "blue thunder"]],
  ["castle-quest", ["he-man", "he man", "she-ra", "she ra", "gummi", "thundercats", "dungeons & dragons", "dungeons and dragons", "dragon's lair", "princess of power", "visionaries", "pirates of dark water", "xena", "hercules", "legend of the hidden temple", "conan"]],
  ["block-party", ["fresh prince", "in living color", "martin", "living single", "yo! mtv raps", "yo mtv raps", "a different world", "moesha", "sister, sister", "sister sister", "kenan & kel", "kenan and kel", "fat albert", "hangin' with mr. cooper", "steve harvey", "def comedy"]],
  ["slime-time", ["all that", "double dare", "rugrats", "pete & pete", "pete and pete", "doug", "rocko", "hey arnold", "ren & stimpy", "ren and stimpy", "salute your shorts", "you can't do that on television", "figure it out", "nickelodeon", "aaahh", "real monsters", "clarissa", "legends of the hidden temple", "guts", "catdog", "angry beavers"]],
  ["beach-day", ["baywatch", "california dreams", "rocket power", "beverly hills", "90210", "summerland", "hang time", "surf"]],
  ["neighborhood", ["mister rogers", "mr. rogers", "mr rogers", "sesame street", "reading rainbow", "fraggle", "muppet", "shining time", "lamb chop", "barney", "zoobilee", "today's special", "eureeka", "pee-wee", "pee wee", "wonderful world of disney", "3-2-1 contact", "electric company"]],
  ["science-lab", ["bill nye", "beakman", "magic school bus", "mr. wizard", "mr wizard", "newton's apple", "square one", "ghostwriter", "where in the world is carmen", "carmen sandiego", "zoom"]],
  ["space", ["star trek", "battlestar", "buck rogers", "babylon 5", "quantum leap", "lost in space", "stargate", "red dwarf", "jetsons", "captain power", "silverhawks", "galaxy rangers", "starcom", "dr. who", "doctor who", "space cases", "alien nation", "farscape", "mystery science", "the v ", "3rd rock"]],
  ["sitcom", ["full house", "family ties", "cosby", "cheers", "growing pains", "who's the boss", "whos the boss", "seinfeld", "friends", "home improvement", "roseanne", "wonder years", "family matters", "married with children", "married... with children", "alf", "perfect strangers", "frasier", "boy meets world", "step by step", "night court", "newhart", "facts of life", "diff'rent strokes", "different strokes", "webster", "mama's family", "designing women", "murphy brown", "wings", "everybody loves raymond", "king of the hill", "the simpsons", "simpsons", "the nanny", "coach", "empty nest", "full house"]],
  ["mall", ["saved by the bell", "fame", "punky brewster", "degrassi", "blossom", "sweet valley", "dawson", "my so-called life", "kids incorporated", "jem", "square pegs", "parker lewis", "head of the class", "mtv", "hey dude", "sabrina", "7th heaven", "daria", "beavis"]],
  ["saturday", ["ninja turtles", "tmnt", "transformers", "g.i. joe", "gi joe", "smurfs", "care bears", "ducktales", "duck tales", "rescue rangers", "chip 'n dale", "chip n dale", "talespin", "tale spin", "animaniacs", "tiny toons", "pinky and the brain", "muppet babies", "inspector gadget", "captain planet", "power rangers", "x-men", "spider-man", "spiderman", "voltron", "ghostbusters", "alvin", "garfield", "looney", "bugs bunny", "my little pony", "strawberry shortcake", "rainbow brite", "dinosaurs", "bobby's world", "dexter", "powerpuff", "johnny bravo", "cartoon", "pokemon", "pokémon", "sailor moon", "dragon ball"]],
];

/** Closest built-in vibe for a favorite show, or null when there is no match. */
export function matchVibe(show: string): VibeId | null {
  const s = ` ${show.toLowerCase().replace(/\s+/g, " ").trim()} `;
  if (s.trim().length < 2) return null;
  for (const [vibe, words] of MATCHERS) {
    if (words.some((w) => s.includes(w))) return vibe;
  }
  return null;
}
