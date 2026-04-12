import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuthStore } from "../store/authStore.js";

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setSessionToken = useAuthStore((s) => s.setSessionToken);
  const [asyncError, setAsyncError] = useState(null);

  const token = params.get("token");

  useEffect(() => {
    if (!token) return;
    setSessionToken(token)
      .then(() => navigate("/", { replace: true }))
      .catch(() => setAsyncError("Could not verify session"));
  }, [token, navigate, setSessionToken]);

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#020817] font-mono text-red-400">
        Missing token
      </div>
    );
  }

  if (asyncError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#020817] font-mono text-red-400">
        {asyncError}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#020817] font-mono text-slate-500">
      Signing you in…
    </div>
  );
}
