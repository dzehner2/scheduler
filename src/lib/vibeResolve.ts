import { db } from "./db";
import { specStyle, type VibeSpec } from "./vibeKit";
import { customId, VIBES, vibeOrDefault, type VibeId } from "./vibes";

/** Everything a page needs to show a vibe. */
export interface ResolvedVibe {
  key: string; // stored value: a VibeId or "custom:<id>"
  name: string;
  blurb: string;
  tagline: string;
  pick: string;
  done: string;
  swatch: [string, string, string];
  className: string;
  style: Record<string, string>;
  custom: boolean;
}

export function fromBuiltIn(id: VibeId): ResolvedVibe {
  const v = VIBES[id];
  return {
    key: id,
    name: v.name,
    blurb: v.blurb,
    tagline: v.tagline,
    pick: v.pick,
    done: v.done,
    swatch: v.swatch,
    className: v.spec ? `vibe-spec vibe-${id}` : `vibe-${id}`,
    style: v.spec ? specStyle(v.spec) : {},
    custom: false,
  };
}

export function fromSpec(key: string, s: VibeSpec): ResolvedVibe {
  return {
    key,
    name: s.name,
    blurb: s.blurb,
    tagline: s.tagline,
    pick: s.pick,
    done: s.done,
    swatch: [s.colors.accent, s.colors.accent2, s.colors.accent3],
    className: "vibe-spec vibe-custom",
    style: specStyle(s),
    custom: true,
  };
}

export async function loadDesign(id: number): Promise<VibeSpec | null> {
  const sql = await db();
  const [r] = await sql<{ spec: VibeSpec }[]>`select spec from vibe_designs where id = ${id}`;
  return r?.spec ?? null;
}

/** Turn a stored vibe value into something renderable. Unknown values fall back to Mall Rat. */
export async function resolveVibe(value: unknown): Promise<ResolvedVibe> {
  const cid = customId(value);
  if (cid) {
    try {
      const s = await loadDesign(cid);
      if (s) return fromSpec(`custom:${cid}`, s);
    } catch {
      // fall through to the default look
    }
  }
  return fromBuiltIn(vibeOrDefault(value));
}
