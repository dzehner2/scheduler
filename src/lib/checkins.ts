import { DateTime } from "luxon";
import { db } from "./db";
import { getSettings } from "./eventTypes";
import type { CheckIn } from "./wellbeing";

export interface CheckInRow extends Partial<CheckIn> {
  skipped: boolean;
}

/** Today's date in the user's own time zone. */
export async function todayFor(userId: number): Promise<string> {
  const { time_zone } = await getSettings(userId);
  return DateTime.now().setZone(time_zone).toISODate()!;
}

export async function todaysCheckIn(userId: number): Promise<CheckInRow | null> {
  const sql = await db();
  const [r] = await sql<CheckInRow[]>`
    select energy, stress, mood, skipped from user_checkins where user_id = ${userId} and day = ${await todayFor(userId)}`;
  return r ?? null;
}
