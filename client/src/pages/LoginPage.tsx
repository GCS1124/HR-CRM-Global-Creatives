import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CircleCheckBig,
  Clock3,
  Github,
  LockKeyhole,
  ShieldCheck,
  Stars,
  UserCheck2,
  UserPlus,
  WandSparkles,
} from "lucide-react";
import type { AuthResult } from "../hooks/useAuthSession";
import { BrandLogo } from "../components/BrandLogo";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<AuthResult>;
  onSignup: (name: string, email: string, password: string) => Promise<AuthResult>;
  onGithubSignIn: () => Promise<AuthResult>;
  onGoogleSignIn: () => Promise<AuthResult>;
  isSupabaseConfigured: boolean;
}

type AuthMode = "login" | "signup";

function getPasswordStrength(value: string): { label: string; score: number; tone: string } {
  const lengthScore = Math.min(value.length / 12, 1);
  const hasNumber = /\d/.test(value) ? 0.2 : 0;
  const hasUpper = /[A-Z]/.test(value) ? 0.2 : 0;
  const hasSpecial = /[^A-Za-z0-9]/.test(value) ? 0.2 : 0;
  const score = Math.min(lengthScore + hasNumber + hasUpper + hasSpecial, 1);

  if (score < 0.4) {
    return { label: "Weak", score, tone: "bg-rose-500" };
  }

  if (score < 0.75) {
    return { label: "Medium", score, tone: "bg-amber-500" };
  }

  return { label: "Strong", score, tone: "bg-emerald-500" };
}

export function LoginPage({
  onLogin,
  onSignup,
  onGithubSignIn,
  onGoogleSignIn,
  isSupabaseConfigured,
}: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const passwordStrength = useMemo(() => getPasswordStrength(signupPassword), [signupPassword]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      const result = await onLogin(loginEmail.trim(), loginPassword.trim());

      if (!result.success) {
        setError(result.message ?? "Invalid credentials. Use your registered account.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (signupPassword !== signupConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSignup(signupName.trim(), signupEmail.trim(), signupPassword);

      if (!result.success) {
        setError(result.message ?? "Unable to create account.");
        return;
      }

      if (result.message) {
        setInfo(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      const result = await onGoogleSignIn();

      if (!result.success) {
        setError(result.message ?? "Google sign-in failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGithubSignIn = async () => {
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      const result = await onGithubSignIn();

      if (!result.success) {
        setError(result.message ?? "GitHub sign-in failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen animate-page-enter items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative grid w-full max-w-7xl overflow-hidden rounded-[36px] border border-white/16 bg-white/[0.05] shadow-[0_40px_120px_-60px_rgba(0,0,0,0.8)] backdrop-blur-xl lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden px-8 py-10 text-white lg:block xl:px-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_30%)]" />

          <div className="relative max-w-xl">
            <BrandLogo variant="plain" size="xl" />
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.22em] text-brand-100">
              <Stars className="h-3.5 w-3.5" />
              Global Creative Services HR CRM
            </p>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] text-white">
              Premium HR CRM access with a sharper operational shell.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/90">
              Sign in to the admin or employee workspace with secure Supabase auth, role-aware access, and faster day-to-day workflows.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/82">Access</p>
                <p className="mt-2 text-2xl font-extrabold">2</p>
                <p className="mt-1 text-sm text-white/88">Admin + Employee workspaces</p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/82">Auth</p>
                <p className="mt-2 text-2xl font-extrabold">OAuth</p>
                <p className="mt-1 text-sm text-white/88">Google and GitHub ready</p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-white/82">Security</p>
                <p className="mt-2 text-2xl font-extrabold">RLS</p>
                <p className="mt-1 text-sm text-white/88">Role-aligned data visibility</p>
              </div>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/12 bg-white/[0.08] p-5 backdrop-blur-sm">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-brand-100">
                <WandSparkles className="h-3.5 w-3.5" />
                Workspace Value
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                {[
                  "Attendance, leave, payroll, and employee identity in one system.",
                  "Role-scoped routes so the UI stays focused and safe.",
                  "A cleaner shell aligned to the Global Creative visual tone.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
                    <CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                    <span className="text-white/92">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] p-4">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/84">
                  <Building2 className="h-3.5 w-3.5" />
                  Built for operations
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/90">
                  Designed for HR teams that need controlled access, fast navigation, and a more serious product surface.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] p-4">
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-white/84">
                  <Clock3 className="h-3.5 w-3.5" />
                  Faster daily flow
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/90">
                  Cleaner hierarchy reduces friction when employees check attendance and admins review live records.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,rgba(248,251,255,0.96),rgba(234,242,252,0.94))] p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-xl rounded-[32px] border border-white/80 bg-white/84 p-5 shadow-[0_28px_80px_-46px_rgba(8,17,38,0.55)] backdrop-blur-xl sm:p-7">
            <div className="mb-6 text-center lg:text-left">
              <BrandLogo size="lg" containerClassName="mx-auto rounded-[24px] px-4 py-3 lg:mx-0" />
              <p className="mt-4 text-[0.68rem] font-black uppercase tracking-[0.22em] text-brand-700">Global Creative Services</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-brand-950 sm:text-[2.4rem]">
                {mode === "login" ? "Access your workspace" : "Create your workspace account"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-700/82">
                {mode === "login"
                  ? "Use your approved credentials or connected provider to enter the HR CRM."
                  : "Register once, then continue into the role-aware HR workspace with secure access."}
              </p>
            </div>

            {!isSupabaseConfigured ? (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Supabase is not configured in frontend environment variables.
              </div>
            ) : null}

            <div className="mb-5 grid grid-cols-2 rounded-2xl border border-brand-200 bg-brand-50/90 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setInfo(null);
                }}
                className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                  mode === "login" ? "bg-white text-brand-900 shadow-sm" : "text-brand-700"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setInfo(null);
                }}
                className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                  mode === "signup" ? "bg-white text-brand-900 shadow-sm" : "text-brand-700"
                }`}
              >
                Sign up
              </button>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="btn-secondary w-full justify-between px-4"
                onClick={() => void handleGoogleSignIn()}
                disabled={isSubmitting || !isSupabaseConfigured}
              >
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Continue with Google
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex w-full items-center justify-between gap-2 rounded-2xl border border-brand-900 bg-brand-900 px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => void handleGithubSignIn()}
                disabled={isSubmitting || !isSupabaseConfigured}
              >
                <span className="inline-flex items-center gap-2">
                  <Github className="h-4 w-4" />
                  Continue with GitHub
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-brand-700/58">
              <span className="h-px flex-1 bg-brand-200" />
              Secure email access
              <span className="h-px flex-1 bg-brand-200" />
            </div>

            {mode === "login" ? (
              <form onSubmit={(event) => void handleLogin(event)} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="mb-2 block text-[0.7rem] font-black uppercase tracking-[0.18em] text-brand-700">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    className="input-surface w-full"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-2 block text-[0.7rem] font-black uppercase tracking-[0.18em] text-brand-700">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    className="input-surface w-full"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
                {info ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{info}</p> : null}

                <button
                  type="submit"
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting || !isSupabaseConfigured}
                >
                  <LockKeyhole className="h-4 w-4" />
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              <form onSubmit={(event) => void handleSignup(event)} className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="mb-2 block text-[0.7rem] font-black uppercase tracking-[0.18em] text-brand-700">
                    Full name
                  </label>
                  <input
                    id="signup-name"
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                    className="input-surface w-full"
                    placeholder="Jane Doe"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="mb-2 block text-[0.7rem] font-black uppercase tracking-[0.18em] text-brand-700">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    className="input-surface w-full"
                    placeholder="name@company.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="mb-2 block text-[0.7rem] font-black uppercase tracking-[0.18em] text-brand-700">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                    className="input-surface w-full"
                    placeholder="Create a strong password"
                    required
                  />

                  <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50/75 p-3">
                    <div className="h-2 rounded-full bg-white">
                      <div
                        className={`h-full rounded-full ${passwordStrength.tone}`}
                        style={{ width: `${Math.max(passwordStrength.score * 100, 5)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-brand-700">Password strength: {passwordStrength.label}</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-confirm-password" className="mb-2 block text-[0.7rem] font-black uppercase tracking-[0.18em] text-brand-700">
                    Confirm password
                  </label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    value={signupConfirmPassword}
                    onChange={(event) => setSignupConfirmPassword(event.target.value)}
                    className="input-surface w-full"
                    placeholder="Repeat your password"
                    required
                  />
                </div>

                {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}
                {info ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{info}</p> : null}

                <button
                  type="submit"
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting || !isSupabaseConfigured}
                >
                  <UserPlus className="h-4 w-4" />
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[24px] border border-brand-200 bg-brand-50/80 p-4">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-brand-700">Security Layer</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-brand-700/86">
                  Session-protected access with role-aware routing and Supabase-backed authentication across the CRM.
                </p>
                <button type="button" className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-brand-700">
                  View security details
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="rounded-[24px] border border-brand-200 bg-white p-4">
                <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-brand-700">
                  <UserCheck2 className="h-3.5 w-3.5" />
                  Access note
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-brand-700/86">
                  New users default to employee access unless elevated by HR admin in the CRM.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
