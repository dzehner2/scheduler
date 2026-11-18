import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  if (await currentUser()) redirect("/dashboard");
  return (
    <main className="container narrow">
      <div className="card stack" style={{ marginTop: 64 }}>
        <Logo />
        <p className="muted">Sign in with the Google account you signed up with.</p>
        {error && <div className="alert error">{error}</div>}
        <a className="btn" href="/api/auth/google?mode=login">
          Sign in with Google
        </a>
        <p className="small muted">
          New here? <a href="/signup">Get your own PlayDate</a>
        </p>
      </div>
    </main>
  );
}
