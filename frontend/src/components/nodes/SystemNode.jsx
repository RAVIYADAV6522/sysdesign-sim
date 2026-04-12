import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

import { COMPONENTS } from "../../simulation/constants.js";
import { getStatusColor } from "../../simulation/engine.js";
import { useSimStore } from "../../store/useSimStore.js";

function SystemNodeComponent({ id, data, selected }) {
  const componentType = data.componentType;
  const def = COMPONENTS[componentType];
  const failed = Boolean(data.failed);

  const res = useSimStore((s) => s.simResult?.nodeResults?.[id]);
  const simRunning = useSimStore((s) => s.simRunning);
  const animStep = useSimStore((s) => s.animStep);
  const nodes = useSimStore((s) => s.nodes);

  const ordered = [...nodes].sort((a, b) => a.position.x - b.position.x);
  const idx = ordered.findIndex((n) => n.id === id);
  const isAnimating = simRunning && animStep > idx;

  const statusColor = res
    ? getStatusColor(res.status)
    : isAnimating
      ? "#FCD34D"
      : "#334155";

  const borderColor = failed ? "#374151" : selected ? "#6EE7B7" : statusColor;
  const showBottleneckGlow = res?.status === "bottleneck" || selected;

  if (!def) return null;

  return (
    <div className="relative" style={{ width: 112, height: 56 }}>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border !border-slate-600 !bg-slate-900"
      />
      <div
        className="relative flex h-14 w-[112px] flex-col rounded-[10px] border text-left shadow-lg transition-all"
        style={{
          background: failed ? "#111827" : def.bg,
          borderColor,
          borderWidth: res || selected ? 2 : 1,
        }}
      >
        {showBottleneckGlow && (
          <div
            className="pointer-events-none absolute -inset-1 rounded-[12px] opacity-60 blur-[2px]"
            style={{
              boxShadow:
                res?.status === "bottleneck"
                  ? "0 0 12px #F87171"
                  : "0 0 10px #6EE7B7",
            }}
          />
        )}

        <div className="flex flex-1 items-start gap-2 px-2 pt-1.5">
          <span
            className="font-mono text-lg leading-none"
            style={{ color: failed ? "#4B5563" : def.color }}
          >
            {failed ? "✕" : def.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div
              className="truncate font-mono text-[10px] font-bold uppercase tracking-wide text-slate-100"
              title={def.label}
            >
              {def.label}
            </div>
            {res ? (
              <div
                className="truncate font-mono text-[9px]"
                style={{ color: statusColor }}
              >
                {res.latency}ms · {res.status}
              </div>
            ) : (
              <div className="font-mono text-[10px] font-bold text-white">
                {def.baseLatency}ms base
              </div>
            )}
          </div>
        </div>

        {res && (
          <div
            className="h-2.5 rounded-b-[10px] opacity-70"
            style={{ background: statusColor }}
          />
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border !border-slate-600 !bg-slate-900"
      />
    </div>
  );
}

export const SystemNode = memo(SystemNodeComponent);
