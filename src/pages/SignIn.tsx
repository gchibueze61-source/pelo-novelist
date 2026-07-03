import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PeloMark from "../components/PeloMark";

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 dark:bg-surface">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <PeloMark size="lg" />
          <p className="mt-4 text-sm text-muted dark:text-muted-dark">Welcome back.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-white/60 p-6 dark:border-border-dark dark:bg-surface-raised/60">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink dark:text-ink-dark">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-ink outline-none focus:border-plum dark:border-border-dark dark:bg-surface-sunken dark:text-ink-dark"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink dark:text-ink-dark">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-ink outline-none focus:border-plum dark:border-border-dark dark:bg-surface-sunken dark:text-ink-dark"
            />
          </label>

          {error && <p className="text-sm text-rust">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-plum py-3 font-medium text-paper transition hover:bg-plum-dark disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted dark:text-muted-dark">
          New here?{" "}
          <Link to="/sign-up" className="font-medium text-plum underline underline-offset-2 dark:text-gold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
