import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { FlowCanvas } from "../components/FlowCanvas.jsx";
import { api, getToken } from "../lib/api.js";
import { flowToApiPayload } from "../lib/designFormat.js";
import { COMPONENTS } from "../simulation/constants.js";
import { getStatusColor } from "../simulation/engine.js";
import { TEMPLATES } from "../simulation/templates.js";
import { useAuthStore } from "../store/authStore.js";
import { useSimStore } from "../store/useSimStore.js";

function ScorePill({ label, value, color }) {
  return (
    <div
      className="rounded-lg border px-3 py-1 text-center"
      style={{ borderColor: `${color}22`, background: "#0F172A" }}
    >
      <div className="font-mono text-[9px] tracking-widest text-slate-500">
        {label.toUpperCase()}
      </div>
      <div className="font-mono text-sm font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0F172A] px-2.5 py-2">
      <div className="font-mono text-[9px] tracking-widest text-slate-500">
        {label.toUpperCase()}
      </div>
      <div className="mt-0.5 font-mono text-[15px] font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function SimulatorPage() {
  const { id: routeDesignId } = useParams();
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const logout = useAuthStore((s) => s.logout);

  const traffic = useSimStore((s) => s.traffic);
  const setTraffic = useSimStore((s) => s.setTraffic);
  const simResult = useSimStore((s) => s.simResult);
  const simRunning = useSimStore((s) => s.simRunning);
  const activeTab = useSimStore((s) => s.activeTab);
  const setActiveTab = useSimStore((s) => s.setActiveTab);
  const loadTemplate = useSimStore((s) => s.loadTemplate);
  const addComponent = useSimStore((s) => s.addComponent);
  const simulate = useSimStore((s) => s.simulate);
  const reset = useSimStore((s) => s.reset);
  const selectedId = useSimStore((s) => s.selectedId);
  const nodes = useSimStore((s) => s.nodes);
  const deleteNode = useSimStore((s) => s.deleteNode);
  const toggleFail = useSimStore((s) => s.toggleFail);
  const readOnly = useSimStore((s) => s.readOnly);
  const designName = useSimStore((s) => s.designName);
  const setDesignName = useSimStore((s) => s.setDesignName);
  const currentDesignId = useSimStore((s) => s.currentDesignId);
  const setDesignMeta = useSimStore((s) => s.setDesignMeta);
  const hydrateFromApiDesign = useSimStore((s) => s.hydrateFromApiDesign);
  const setReadOnly = useSimStore((s) => s.setReadOnly);
  const resetToNewCanvas = useSimStore((s) => s.resetToNewCanvas);

  const [savePublic, setSavePublic] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const prevRouteDesignId = useRef(undefined);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const prev = prevRouteDesignId.current;
    prevRouteDesignId.current = routeDesignId;

    if (!routeDesignId) {
      setReadOnly(false);
      if (prev) {
        resetToNewCanvas();
      }
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const hasToken = Boolean(getToken());
        if (hasToken) {
          try {
            const { design } = await api.getDesign(routeDesignId);
            if (cancelled) return;
            hydrateFromApiDesign(design);
            setDesignMeta({ id: design.id, name: design.name });
            setDesignName(design.name);
            setSavePublic(Boolean(design.isPublic));
            setReadOnly(false);
            return;
          } catch (e) {
            if (e.status !== 404) {
              navigate("/", { replace: true });
              return;
            }
          }
        }
        const { design } = await api.getPublicDesign(routeDesignId);
        if (cancelled) return;
        hydrateFromApiDesign(design);
        setDesignMeta({ id: design.id, name: design.name });
        setDesignName(design.name);
        setSavePublic(Boolean(design.isPublic));
        setReadOnly(true);
      } catch {
        navigate("/", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    routeDesignId,
    navigate,
    hydrateFromApiDesign,
    setDesignMeta,
    setDesignName,
    setReadOnly,
    resetToNewCanvas,
  ]);

  const handleSave = useCallback(async () => {
    if (!user || readOnly) return;
    setSaveMessage("");
    const snap = useSimStore.getState();
    const body = {
      name: (snap.designName || "Untitled").trim() || "Untitled",
      ...flowToApiPayload(snap),
      isPublic: savePublic,
    };
    try {
      if (snap.currentDesignId) {
        const { design } = await api.updateDesign(snap.currentDesignId, body);
        setDesignMeta({ id: design.id, name: design.name });
        setDesignName(design.name);
        setSaveMessage("Saved");
      } else {
        const { design } = await api.createDesign(body);
        setDesignMeta({ id: design.id, name: design.name });
        setDesignName(design.name);
        setSaveMessage("Created");
        navigate(`/design/${design.id}`, { replace: true });
      }
    } catch (e) {
      setSaveMessage(e.message || "Save failed");
    }
  }, [user, readOnly, savePublic, setDesignMeta, setDesignName, navigate]);

  const handleFork = useCallback(async () => {
    if (!user || !routeDesignId) return;
    try {
      const { design } = await api.forkDesign(routeDesignId);
      setReadOnly(false);
      setDesignMeta({ id: design.id, name: design.name });
      setDesignName(design.name);
      setSavePublic(false);
      hydrateFromApiDesign(design);
      navigate(`/design/${design.id}`, { replace: true });
    } catch (e) {
      setSaveMessage(e.message || "Fork failed");
    }
  }, [
    user,
    routeDesignId,
    setReadOnly,
    setDesignMeta,
    setDesignName,
    hydrateFromApiDesign,
    navigate,
  ]);

  const selectedNode = nodes.find((n) => n.id === selectedId);
  const selectedType = selectedNode?.data?.componentType;
  const orderedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x);

  const chartData =
    simResult && orderedNodes.length > 0
      ? orderedNodes.map((n) => {
          const res = simResult.nodeResults[n.id];
          const def = COMPONENTS[n.data.componentType];
          return {
            name: def?.label ?? n.data.componentType,
            latency: res?.latency ?? 0,
            fill: getStatusColor(res?.status),
          };
        })
      : [];

  const shareUrl =
    typeof window !== "undefined" && currentDesignId && savePublic
      ? `${window.location.origin}/design/${currentDesignId}`
      : "";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#020817] text-slate-200">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#0A0F1E] px-4 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="flex items-baseline gap-1.5 no-underline"
            onClick={() => resetToNewCanvas()}
          >
            <span className="text-lg font-extrabold tracking-tight text-emerald-300">
              ◈ SysDesign
            </span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
              Simulator
            </span>
          </Link>
          <nav className="flex items-center gap-2 font-mono text-[11px]">
            <Link
              className="text-slate-500 no-underline hover:text-slate-300"
              to="/"
              onClick={() => resetToNewCanvas()}
            >
              New canvas
            </Link>
            <span className="text-slate-700">·</span>
            <Link
              className="text-slate-500 no-underline hover:text-slate-300"
              to="/designs"
            >
              My designs
            </Link>
            {!user ? (
              <>
                <span className="text-slate-700">·</span>
                <Link
                  className="text-slate-500 no-underline hover:text-slate-300"
                  to="/login"
                >
                  Sign in
                </Link>
              </>
            ) : null}
          </nav>
        </div>

        <div className="flex flex-1 justify-center">
          {simResult && (
            <div className="flex flex-wrap justify-center gap-2">
              <ScorePill
                label="Health"
                value={`${simResult.healthScore}/100`}
                color={
                  simResult.healthScore > 70
                    ? "#6EE7B7"
                    : simResult.healthScore > 40
                      ? "#FCD34D"
                      : "#F87171"
                }
              />
              <ScorePill
                label="Latency"
                value={`${simResult.totalLatency}ms`}
                color="#93C5FD"
              />
              <ScorePill
                label="Throughput"
                value={`${simResult.effectiveRps} rps`}
                color="#F9A8D4"
              />
              <ScorePill
                label="Error Rate"
                value={`${simResult.errorRate}%`}
                color={simResult.errorRate > 10 ? "#F87171" : "#6EE7B7"}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {user && !readOnly && (
            <div className="flex flex-wrap items-center gap-2 border-r border-slate-800 pr-3">
              <input
                className="w-36 rounded-md border border-slate-800 bg-[#0F172A] px-2 py-1 font-mono text-[11px] text-slate-200 outline-none focus:border-slate-700"
                placeholder="Design name"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
              />
              <label className="flex cursor-pointer items-center gap-1 font-mono text-[10px] text-slate-500">
                <input
                  type="checkbox"
                  checked={savePublic}
                  onChange={(e) => setSavePublic(e.target.checked)}
                />
                Public link
              </label>
              <button
                type="button"
                className="rounded-lg bg-slate-800 px-2.5 py-1 font-mono text-[11px] text-emerald-200 hover:bg-slate-700"
                onClick={handleSave}
              >
                Save
              </button>
              {shareUrl ? (
                <button
                  type="button"
                  className="rounded-lg border border-slate-700 px-2 py-1 font-mono text-[10px] text-slate-400 hover:border-slate-600"
                  onClick={() =>
                    navigator.clipboard.writeText(shareUrl).catch(() => {})
                  }
                  title={shareUrl}
                >
                  Copy share URL
                </button>
              ) : null}
              {saveMessage ? (
                <span className="font-mono text-[10px] text-slate-500">
                  {saveMessage}
                </span>
              ) : null}
            </div>
          )}

          {readOnly && user && routeDesignId ? (
            <button
              type="button"
              className="rounded-lg border border-slate-700 px-3 py-1.5 font-mono text-[11px] text-slate-300 hover:border-slate-600"
              onClick={handleFork}
            >
              Fork to my account
            </button>
          ) : null}

          {user ? (
            <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  className="h-7 w-7 rounded-full border border-slate-700"
                />
              ) : null}
              <span className="max-w-[120px] truncate font-mono text-[10px] text-slate-500">
                {user.name || user.email}
              </span>
              <button
                type="button"
                className="font-mono text-[10px] text-slate-500 underline hover:text-slate-300"
                onClick={() => logout()}
              >
                Log out
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="cursor-pointer rounded-lg border border-slate-800 px-3.5 py-1.5 font-mono text-xs text-slate-400 transition hover:border-slate-700 hover:text-slate-300"
            onClick={reset}
          >
            Reset
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-lg bg-emerald-300 px-4 py-1.5 font-mono text-sm font-extrabold text-emerald-950 transition disabled:cursor-not-allowed disabled:opacity-60"
            onClick={simulate}
            disabled={simRunning}
          >
            {simRunning ? "Simulating..." : "▶ Simulate"}
          </button>
        </div>
      </header>

      {readOnly ? (
        <div className="border-b border-amber-900/50 bg-amber-950/40 px-4 py-1.5 text-center font-mono text-[11px] text-amber-200/90">
          View-only shared design — fork to edit your own copy.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-slate-800 bg-[#0A0F1E]">
          <div className="flex border-b border-slate-800">
            <button
              type="button"
              className={`flex-1 py-2.5 font-mono text-[11px] tracking-wide ${
                activeTab === "components"
                  ? "border-b-2 border-emerald-300 text-emerald-300"
                  : "text-slate-600"
              }`}
              onClick={() => setActiveTab("components")}
              disabled={readOnly}
            >
              Components
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 font-mono text-[11px] tracking-wide ${
                activeTab === "templates"
                  ? "border-b-2 border-emerald-300 text-emerald-300"
                  : "text-slate-600"
              }`}
              onClick={() => setActiveTab("templates")}
              disabled={readOnly}
            >
              Templates
            </button>
          </div>

          {activeTab === "components" && (
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              <p className="m-0 px-3 pb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
                Click to add to canvas
              </p>
              {Object.values(COMPONENTS).map((c) => (
                <button
                  key={c.type}
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-1.5 text-left text-slate-400 transition hover:bg-slate-900/80 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => addComponent(c.type)}
                  disabled={readOnly}
                >
                  <span
                    className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md text-sm"
                    style={{ background: c.bg, color: c.color }}
                  >
                    {c.icon}
                  </span>
                  <span>
                    <span className="block font-mono text-[11px] font-bold text-slate-300">
                      {c.label}
                    </span>
                    <span className="mt-0.5 block font-mono text-[9px] text-slate-600">
                      {c.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {activeTab === "templates" && (
            <div className="min-h-0 flex-1 overflow-y-auto py-2">
              <p className="m-0 px-3 pb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
                Load a preset architecture
              </p>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button
                  key={key}
                  type="button"
                  className="w-full cursor-pointer border-b border-slate-900 px-3 py-2.5 text-left text-slate-400 transition hover:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => loadTemplate(key)}
                  disabled={readOnly}
                >
                  <span className="block font-mono text-[11px] font-bold text-slate-300">
                    {t.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] text-slate-600">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-slate-800 p-3">
            <p className="m-0 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
              Traffic parameters
            </p>
            <label className="mt-2 block font-mono text-[9px] uppercase tracking-wide text-slate-600">
              Users
            </label>
            <input
              className="mt-1 w-full rounded-md border border-slate-800 bg-[#0F172A] px-2 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-slate-700 disabled:opacity-40"
              type="number"
              value={traffic.users}
              disabled={readOnly}
              onChange={(e) =>
                setTraffic({ ...traffic, users: +e.target.value })
              }
            />
            <label className="mt-2 block font-mono text-[9px] uppercase tracking-wide text-slate-600">
              Requests / second
            </label>
            <input
              className="mt-1 w-full rounded-md border border-slate-800 bg-[#0F172A] px-2 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-slate-700 disabled:opacity-40"
              type="number"
              value={traffic.rps}
              disabled={readOnly}
              onChange={(e) =>
                setTraffic({ ...traffic, rps: +e.target.value })
              }
            />
          </div>
        </aside>

        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>

        <aside className="w-[260px] shrink-0 overflow-y-auto border-l border-slate-800 bg-[#0A0F1E] p-3">
          {selectedNode && selectedType && COMPONENTS[selectedType] && (
            <div className="mb-3 rounded-[10px] border border-slate-800 bg-[#0F172A] p-3">
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className="text-xl"
                  style={{ color: COMPONENTS[selectedType].color }}
                >
                  {COMPONENTS[selectedType].icon}
                </span>
                <span className="font-mono text-[13px] font-bold text-slate-200">
                  {COMPONENTS[selectedType].label}
                </span>
              </div>

              {simResult?.nodeResults?.[selectedId] && (
                <div className="mb-2.5 grid grid-cols-2 gap-1.5">
                  {(() => {
                    const r = simResult.nodeResults[selectedId];
                    return (
                      <>
                        <Metric
                          label="Latency"
                          value={`${r.latency}ms`}
                          color={getStatusColor(r.status)}
                        />
                        <Metric
                          label="Status"
                          value={r.status}
                          color={getStatusColor(r.status)}
                        />
                        <Metric
                          label="Throughput"
                          value={`${r.throughput} rps`}
                          color="#93C5FD"
                        />
                        <Metric
                          label="Error Rate"
                          value={`${r.errorRate}%`}
                          color={r.errorRate > 0 ? "#F87171" : "#6EE7B7"}
                        />
                      </>
                    );
                  })()}
                </div>
              )}

              {!readOnly && (
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-lg border border-red-900 bg-red-950/60 px-3 py-2 font-mono text-[11px] text-red-300 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => toggleFail(selectedId)}
                    disabled={simRunning}
                  >
                    {selectedNode.data.failed
                      ? "↑ Restore Node"
                      : "💥 Simulate Failure"}
                  </button>
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 font-mono text-[11px] text-slate-400 transition hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => deleteNode(selectedId)}
                    disabled={simRunning}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}

          {simResult?.suggestions?.length > 0 && (
            <div className="mb-3 rounded-[10px] border border-slate-800 bg-[#0F172A] p-3">
              <p className="m-0 mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
                Optimization suggestions
              </p>
              {simResult.suggestions.map((s, i) => {
                const node = nodes.find((n) => n.id === s.nodeId);
                const def = node
                  ? COMPONENTS[node.data.componentType]
                  : null;
                return (
                  <div
                    key={i}
                    className="mb-2 font-mono text-[11px] leading-snug text-slate-400 last:mb-0"
                  >
                    <span style={{ color: def?.color || "#F87171" }}>▸ </span>
                    {s.message}
                  </div>
                );
              })}
            </div>
          )}

          {!simResult && (
            <div className="mb-3 rounded-[10px] border border-slate-800 bg-[#0F172A] p-3">
              <p className="m-0 mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
                Node status legend
              </p>
              {[
                ["healthy", "#6EE7B7", "Load < 70%"],
                ["stressed", "#FCD34D", "Load 70–100%"],
                ["bottleneck", "#F87171", "Load > 100%"],
                ["failed", "#6B7280", "Manually failed"],
              ].map(([s, c, d]) => (
                <div key={s} className="mb-1.5 flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: c }}
                  />
                  <span className="font-mono text-xs text-slate-500">
                    <span style={{ color: c }} className="font-semibold">
                      {s}
                    </span>{" "}
                    — {d}
                  </span>
                </div>
              ))}
              <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-600">
                Drag from a node&apos;s right handle to another&apos;s left
                handle to connect.
              </p>
            </div>
          )}

          {simResult && chartData.length > 0 && (
            <div className="rounded-[10px] border border-slate-800 bg-[#0F172A] p-3">
              <p className="m-0 mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">
                Latency breakdown
              </p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={92}
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      interval={0}
                    />
                    <Bar dataKey="latency" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
