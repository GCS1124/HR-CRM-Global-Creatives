import type { CSSProperties, FormEvent } from "react";
import { useMemo, useState } from "react";
import { Github, ShieldCheck, Fingerprint } from "lucide-react";
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

const darkInputStyle: CSSProperties & Record<string, string> = {
  "--input-bg": "#0f172a",
  "--input-text": "#fff",
};

function getPasswordStrength(value: string): { label: string; score: number; tone: string } {
  const lengthScore = Math.min(value.length / 12, 1);
  const hasNumber = /\d/.test(value) ? 0.2 : 0;
  const hasUpper = /[A-Z]/.test(value) ? 0.2 : 0;
  const hasSpecial = /[^A-Za-z0-9]/.test(value) ? 0.2 : 0;
  const score = Math.min(lengthScore + hasNumber + hasUpper + hasSpecial, 1);
  if (score < 0.4) return { label: "Weak", score, tone: "bg-rose-500" };
  if (score < 0.75) return { label: "Medium", score, tone: "bg-amber-500" };
  return { label: "Strong", score, tone: "bg-emerald-500" };
}

export function LoginPage({ onLogin, onSignup, onGithubSignIn, onGoogleSignIn, isSupabaseConfigured }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>(() => {
    if (typeof window === "undefined") return "login";
    return window.localStorage.getItem("hrcrm_auth_mode") === "signup" ? "signup" : "login";
  });
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
    setIsSubmitting(true);
    try {
      const result = await onLogin(loginEmail.trim(), loginPassword.trim());
      if (!result.success) setError(result.message ?? "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (signupPassword !== signupConfirmPassword) { setError("Passwords do not match."); return; }
    setIsSubmitting(true);
    try {
      const result = await onSignup(signupName.trim(), signupEmail.trim(), signupPassword);
      if (!result.success) { setError(result.message ?? "Registration failed."); return; }
      if (result.message) setInfo(result.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-slate-950">
      {/* Background optimized for performance */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.15),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(14,116,255,0.12),transparent_40%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1fr_440px] bg-slate-900/50 rounded-[32px] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Left Side: Brand & Messaging */}
        <aside className="hidden lg:flex flex-col justify-between p-10 border-r border-white/10 bg-gradient-to-br from-brand-900/20 to-transparent">
          <div className="space-y-8">
            <BrandLogo variant="plain" size="4xl" />
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[0.65rem] font-black uppercase tracking-widest text-brand-400">
                 <Fingerprint className="h-3 w-3" />
                 Secure Portal
              </div>
              <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
                Empowering the modern workforce.
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed max-w-md font-medium">
                Enter your professional dashboard to manage talent, payroll, and operations with high-signal precision.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-500 border-t border-white/5 pt-8">
             <span>Role-Based Access</span>
             <span>OAuth 2.0</span>
             <span>TLS Encrypted</span>
          </div>
        </aside>

        {/* Right Side: Auth Form */}
        <main className="p-6 sm:p-10 flex flex-col justify-center bg-white/5 short:p-8">
          <div className="mb-8">
            <div className="lg:hidden mb-8"><BrandLogo variant="plain" size="xl" /></div>
            <h2 className="text-2xl font-black text-white tracking-tight">{mode === "login" ? "Welcome back" : "Create account"}</h2>
            <p className="text-slate-400 text-sm font-bold mt-1">{mode === "login" ? "Enter your credentials to continue." : "Register for workspace access."}</p>
          </div>

          <div className="flex p-1 bg-slate-950/50 rounded-xl border border-white/10 mb-6">
            <button onClick={() => setMode("login")} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'login' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Sign In</button>
            <button onClick={() => setMode("signup")} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Sign Up</button>
          </div>

          {mode === "login" && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => void onGoogleSignIn()} disabled={isSubmitting} className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition disabled:opacity-50">
                <ShieldCheck className="h-4 w-4" /> Google
              </button>
              <button onClick={() => void onGithubSignIn()} disabled={isSubmitting} className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition disabled:opacity-50">
                <Github className="h-4 w-4" /> GitHub
              </button>
            </div>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
            <div className="relative flex justify-center text-[0.6rem] font-black uppercase tracking-widest"><span className="bg-transparent px-2 text-slate-500">Or use email</span></div>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-[0.65rem] font-black uppercase text-slate-500 ml-1">Full Name</label>
                <input required value={signupName} onChange={(e) => setSignupName(e.target.value)} className="input-surface w-full h-11 bg-slate-900 border-white/10 text-white placeholder:text-slate-600" style={darkInputStyle} placeholder="John Doe" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[0.65rem] font-black uppercase text-slate-500 ml-1">Work Email</label>
              <input required type="email" value={mode === 'login' ? loginEmail : signupEmail} onChange={(e) => mode === 'login' ? setLoginEmail(e.target.value) : setSignupEmail(e.target.value)} className="input-surface w-full h-11 bg-slate-900 border-white/10 text-white placeholder:text-slate-600" style={darkInputStyle} placeholder="name@company.com" />
            </div>
            <div className="space-y-1">
              <label className="text-[0.65rem] font-black uppercase text-slate-500 ml-1">Password</label>
              <input required type="password" value={mode === 'login' ? loginPassword : signupPassword} onChange={(e) => mode === 'login' ? setLoginPassword(e.target.value) : setSignupPassword(e.target.value)} className="input-surface w-full h-11 bg-slate-900 border-white/10 text-white placeholder:text-slate-600" style={darkInputStyle} placeholder="••••••••" />
            </div>
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-[0.65rem] font-black uppercase text-slate-500 ml-1">Confirm Password</label>
                <input required type="password" value={signupConfirmPassword} onChange={(e) => setSignupConfirmPassword(e.target.value)} className="input-surface w-full h-11 bg-slate-900 border-white/10 text-white placeholder:text-slate-600" style={darkInputStyle} placeholder="••••••••" />
                <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className={`h-full ${passwordStrength.tone} transition-all duration-500`} style={{ width: `${passwordStrength.score * 100}%` }} />
                </div>
                <p className="text-[0.6rem] font-bold text-slate-500 mt-1 uppercase tracking-tight">Strength: {passwordStrength.label}</p>
              </div>
            )}

            {error && <p className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold leading-relaxed">{error}</p>}
            {info && <p className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold leading-relaxed">{info}</p>}

            <button type="submit" disabled={isSubmitting || !isSupabaseConfigured} className="w-full h-12 mt-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">
              {isSubmitting ? "Processing..." : mode === 'login' ? "Access Workspace" : "Register Profile"}
            </button>
          </form>
          
          {!isSupabaseConfigured && <p className="text-[0.6rem] font-bold text-amber-500 mt-4 text-center uppercase tracking-widest">Environment missing Supabase keys</p>}
        </main>
      </div>
    </div>
  );
}
