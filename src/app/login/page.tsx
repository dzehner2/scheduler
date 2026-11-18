import { redirect } from "next/navigation";
import { currentOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (await currentOwner()) redirect("/dashboard");
  return (
    <main className="container narrow">
      <div className="card stack" style={{ marginTop: 64 }}>
        <h1>PlayDate</h1>
        <p className="muted">Sign in with the Google account listed as the owner.</p>
        {error && <div className="alert error">{error}</div>}
        <a className="btn" href="/api/auth/google?mode=login">
          Sign in with Google
        </a>
      </div>
    </main>
  );
}
