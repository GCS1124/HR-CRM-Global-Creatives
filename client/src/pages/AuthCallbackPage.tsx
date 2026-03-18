import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing secure sign-in...");

  useEffect(() => {
    let isMounted = true;

    const finalize = async () => {
      if (!supabase) {
        if (isMounted) {
          setMessage("Supabase is not configured.");
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/", { replace: true });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (!isMounted) {
        return;
      }

      if (error) {
        setMessage(error.message);
        return;
      }

      navigate("/", { replace: true });
    };

    void finalize();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <div className="rounded-xl border border-brand-200 bg-white px-6 py-4 text-sm font-semibold text-brand-700">
        {message}
      </div>
    </div>
  );
}
