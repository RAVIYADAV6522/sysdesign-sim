import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api, getToken } from "../lib/api.js";
import { useAuthStore } from "../store/authStore.js";

export function DesignsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const [designs, setDesigns] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login", { replace: true });
      return;
    }
    api
      .listDesigns()
      .then((d) => setDesigns(d.designs ?? []))
      .catch((e) => setError(e.message || "Could not load designs"));
  }, [navigate]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020817] font-mono text-slate-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] px-6 py-10 text-slate-200">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-xl font-bold text-emerald-300">
              My designs
            </h1>
            <p className="mt-1 font-mono text-xs text-slate-500">
              Open a design to edit, or share a public link from the canvas.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-slate-700 px-4 py-2 font-mono text-xs text-slate-300 no-underline hover:border-slate-600"
          >
            ← Simulator
          </Link>
        </div>

        {error ? (
          <p className="font-mono text-sm text-red-400">{error}</p>
        ) : null}

        <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-[#0A0F1E]">
          {designs.length === 0 && !error ? (
            <li className="px-4 py-8 text-center font-mono text-sm text-slate-500">
              No saved designs yet. Build on the canvas and click Save.
            </li>
          ) : null}
          {designs.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <Link
                  to={`/design/${d.id}`}
                  className="font-mono text-sm font-semibold text-slate-200 no-underline hover:text-emerald-300"
                >
                  {d.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-2 font-mono text-[10px] text-slate-600">
                  <span>{d.nodeCount} nodes</span>
                  <span>·</span>
                  <span>
                    {d.isPublic ? "Public" : "Private"}
                  </span>
                  <span>·</span>
                  <span>
                    Updated{" "}
                    {d.updatedAt
                      ? new Date(d.updatedAt).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/design/${d.id}`}
                  className="rounded-md border border-slate-700 px-3 py-1 font-mono text-[11px] text-slate-400 no-underline hover:border-slate-600"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
