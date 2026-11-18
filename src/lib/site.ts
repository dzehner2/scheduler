import { getSettings } from "./eventTypes";

/** Who runs this PlayDate, for the public homepage and legal pages. */
export async function siteOperator(): Promise<{ name: string; contact: string | null }> {
  let name = "";
  try {
    name = (await getSettings()).display_name;
  } catch {
    // Database not set up yet; pages still render.
  }
  return { name: name || "the owner of this site", contact: process.env.CONTACT_EMAIL || null };
}

export const LEGAL_UPDATED = "November 18, 2026";
