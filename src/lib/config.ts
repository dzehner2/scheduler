function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See SETUP.md.`);
  return v;
}

export const config = {
  get googleClientId() {
    return required("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return required("GOOGLE_CLIENT_SECRET");
  },
  /** Long random string used to encrypt Google tokens and sign the login cookie. */
  get appSecret() {
    const s = required("APP_SECRET");
    if (s.length < 32) throw new Error("APP_SECRET must be at least 32 characters.");
    return s;
  },
  /** Email(s) allowed to sign in to the dashboard, comma separated. */
  get ownerEmails(): string[] {
    return required("OWNER_EMAIL")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  get databaseUrl() {
    const v = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!v) throw new Error("Missing environment variable DATABASE_URL. See SETUP.md.");
    return v;
  },
  /** Public base URL, no trailing slash. Must match the Google OAuth redirect URI. */
  get appUrl() {
    const explicit = process.env.APP_URL;
    if (explicit) return explicit.replace(/\/$/, "");
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (vercel) return `https://${vercel}`;
    return "http://localhost:3000";
  },
};

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];
