import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { UserProfile, UserRole } from "../types/auth";
import { isSupabaseClientConfigured, supabase } from "../services/supabaseClient";

export interface AuthResult {
  success: boolean;
  message?: string;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

const ADMIN_EMAIL = "test@crm.co.in";
let profileSchemaState: "unknown" | "legacy" | "ready" = "unknown";
let cachedProfile: UserProfile | null = null;
let cachedProfileUserId: string | null = null;
let profileFetchPromise: Promise<UserProfile> | null = null;
let profileFetchPromiseUserId: string | null = null;

const oauthRedirectBase =
  (import.meta.env.VITE_SUPABASE_REDIRECT_URL as string | undefined)?.replace(/\/+$/, "") ??
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, "") ??
  (typeof window !== "undefined" ? window.location.origin : undefined);

const oauthRedirectTo = oauthRedirectBase ? `${oauthRedirectBase}/auth/callback` : undefined;

function toUserRole(value: string | null | undefined, email: string | undefined): UserRole {
  if (value === "admin" || value === "employee") {
    return value;
  }

  if (email?.toLowerCase() === ADMIN_EMAIL) {
    return "admin";
  }

  return "employee";
}

function toProfile(row: ProfileRow, fallbackEmail?: string): UserProfile {
  return {
    id: row.id,
    email: row.email || fallbackEmail || "",
    fullName: row.full_name,
    role: toUserRole(row.role, row.email || fallbackEmail),
  };
}

function buildFallbackProfile(session: Session): UserProfile {
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    fullName: typeof session.user.user_metadata.full_name === "string" ? session.user.user_metadata.full_name : null,
    role: toUserRole(undefined, session.user.email),
  };
}

function isLegacyProfileSchemaError(message: string | undefined): boolean {
  const value = message?.toLowerCase() ?? "";
  return (
    value.includes("ensure_profile") ||
    value.includes("profiles") ||
    value.includes("schema cache") ||
    value.includes("could not find the function")
  );
}

async function fetchUserProfile(session: Session): Promise<UserProfile> {
  if (cachedProfile && cachedProfileUserId === session.user.id) {
    return cachedProfile;
  }

  if (profileFetchPromise && profileFetchPromiseUserId === session.user.id) {
    return profileFetchPromise;
  }

  profileFetchPromiseUserId = session.user.id;
  profileFetchPromise = (async () => {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const email = session.user.email ?? "";

  if (profileSchemaState === "legacy") {
    return buildFallbackProfile(session);
  }

  const ensured = await supabase.rpc("ensure_profile");
  if (!ensured.error && ensured.data) {
    profileSchemaState = "ready";
    const row = ensured.data as ProfileRow;
    return toProfile(row, email);
  }

  if (isLegacyProfileSchemaError(ensured.error?.message)) {
    profileSchemaState = "legacy";
    return buildFallbackProfile(session);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (isLegacyProfileSchemaError(error?.message)) {
    profileSchemaState = "legacy";
    return buildFallbackProfile(session);
  }

  if (error && error.code !== "PGRST116") {
    throw new Error(`Unable to load user profile: ${error.message}`);
  }

  if (data) {
    profileSchemaState = "ready";
    return toProfile(data as ProfileRow, email);
  }

  return buildFallbackProfile(session);
  })();

  try {
    const profile = await profileFetchPromise;
    cachedProfile = profile;
    cachedProfileUserId = session.user.id;
    return profile;
  } finally {
    profileFetchPromise = null;
    profileFetchPromiseUserId = null;
  }
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    const syncAuthState = async (nextSession: Session | null) => {
      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setProfileError(null);

      if (!nextSession) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const nextProfile = await fetchUserProfile(nextSession);

        if (!mounted) {
          return;
        }

        setProfile(nextProfile);
      } catch (error) {
        if (!mounted) {
          return;
        }

        setProfile(buildFallbackProfile(nextSession));

        const message = error instanceof Error ? error.message : "Unable to resolve profile role.";
        setProfileError(message);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void supabase.auth.getSession().then(({ data }) => syncAuthState(data.session ?? null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncAuthState(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase || !isSupabaseClientConfigured) {
      return {
        success: false,
        message: "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  };

  const signUp = async (name: string, email: string, password: string): Promise<AuthResult> => {
    if (!supabase || !isSupabaseClientConfigured) {
      return {
        success: false,
        message: "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    if (!data.session) {
      return {
        success: true,
        message: "Signup successful. Check your inbox to confirm your email before signing in.",
      };
    }

    return { success: true };
  };

  const signInWithGoogle = async (): Promise<AuthResult> => {
    if (!supabase || !isSupabaseClientConfigured) {
      return {
        success: false,
        message: "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthRedirectTo,
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  };

  const signInWithGitHub = async (): Promise<AuthResult> => {
    if (!supabase || !isSupabaseClientConfigured) {
      return {
        success: false,
        message: "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: oauthRedirectTo,
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true };
  };

  const signOut = async (): Promise<void> => {
    if (!supabase) {
      setSession(null);
      setProfile(null);
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return {
    isAuthenticated: Boolean(session),
    isLoading,
    session,
    profile,
    role: profile?.role ?? null,
    profileError,
    isSupabaseConfigured: isSupabaseClientConfigured,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
  };
}
