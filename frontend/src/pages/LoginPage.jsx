import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../lib/api.js";

export function LoginPage() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api
      .authStatus()
      .then((s) => setStatus(s))
      .catch(() => setStatus({ googleOAuthConfigured: false }));
  }, []);

  const startGoogle = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#020817] px-4 text-center">
      <div>
        <Link
          to="/"
          className="text-lg font-extrabold tracking-tight text-emerald-300 no-underline"
        >
          ◈ SysDesign Simulator
        </Link>
        <p className="mt-2 max-w-md font-mono text-sm text-slate-500">
          Sign in with Google to save designs, share public links, and fork
          community architectures.
        </p>
      </div>

      {status && !status.googleOAuthConfigured ? (
        <div className="max-w-lg rounded-lg border border-amber-900/60 bg-amber-950/40 px-4 py-3 font-mono text-xs text-amber-100/90">
          Google OAuth is not configured on the server yet. Add{" "}
          <code className="text-amber-50">GOOGLE_CLIENT_ID</code>,{" "}
          <code className="text-amber-50">GOOGLE_CLIENT_SECRET</code>, and{" "}
          <code className="text-amber-50">GOOGLE_CALLBACK_URL</code> to{" "}
          <code className="text-amber-50">backend/.env</code> (see{" "}
          <code className="text-amber-50">backend/.env.example</code>).
        </div>
      ) : null}

      <button
        type="button"
        onClick={startGoogle}
        className="rounded-lg bg-white px-6 py-2.5 font-mono text-sm font-semibold text-slate-900 shadow hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={status && !status.googleOAuthConfigured}
      >
        Continue with Google
      </button>

      <Link
        to="/"
        className="font-mono text-xs text-slate-600 no-underline hover:text-slate-400"
      >
        ← Back to simulator
      </Link>
    </div>
  );
}
