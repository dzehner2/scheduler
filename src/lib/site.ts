import { getSettings } from "./eventTypes";
import { primaryOwnerId } from "./users";
import { vibeOrDefault, type VibeId } from "./vibes";

/** Who runs this PlayDate, for the public homepage and legal pages. */
export async function siteOperator(): Promise<{ name: string; contact: string | null }> {
  let name = "";
  try {
    const id = await primaryOwnerId();
    if (id) name = (await getSettings(id)).display_name;
  } catch {
    // Database not set up yet; pages still render.
  }
  return { name: name || "the owner of this site", contact: process.env.CONTACT_EMAIL || null };
}

/** The site-wide vibe (homepage, sign-up, legal pages): the primary owner's. */
export async function siteVibe(): Promise<VibeId> {
  try {
    const id = await primaryOwnerId();
    if (id) return vibeOrDefault((await getSettings(id)).vibe);
  } catch {
    // Database not reachable (for example during build): use the default look.
  }
  return "mall";
}

export const LEGAL_UPDATED = "November 18, 2026";
