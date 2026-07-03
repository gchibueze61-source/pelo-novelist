import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import PeloMark from "../components/PeloMark";

export default function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    navigate("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 dark:bg-surface">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <PeloMark size="lg" />
          <p className="mt-4 text-sm text-muted dark:text-muted-dark">Your private writing workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-white/60 p-6 dark:border-border-dark dark:bg-surface-raised/60">
          <Field label="Name" value={name} onChange={setName} placeholder="What should we call you?" />
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" required />

          {error && <p className="text-sm text-rust">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-plum py-3 font-medium text-paper transition hover:bg-plum-dark disabled:opacity-50"
          >
            {loading ? "Creating your account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted dark:text-muted-dark">
          Already have an account?{" "}
          <Link to="/sign-in" className="font-medium text-plum underline underline-offset-2 dark:text-gold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink dark:text-ink-dark">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-ink outline-none placeholder:text-muted/70 focus:border-plum dark:border-border-dark dark:bg-surface-sunken dark:text-ink-dark dark:placeholder:text-muted-dark/70"
      />
    </label>
  );
}
