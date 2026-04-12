import { useCallback, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";

import { getStatusColor } from "../simulation/engine.js";
import { useSimStore } from "../store/useSimStore.js";
import { SystemNode } from "./nodes/SystemNode.jsx";

const nodeTypes = { system: SystemNode };

const defaultEdgeOptions = { style: { strokeWidth: 1.5 } };

export function FlowCanvas() {
  const nodes = useSimStore((s) => s.nodes);
  const edges = useSimStore((s) => s.edges);
  const simResult = useSimStore((s) => s.simResult);
  const simRunning = useSimStore((s) => s.simRunning);
  const animStep = useSimStore((s) => s.animStep);
  const onNodesChange = useSimStore((s) => s.onNodesChange);
  const onEdgesChange = useSimStore((s) => s.onEdgesChange);
  const onConnect = useSimStore((s) => s.onConnect);
  const setSelectedId = useSimStore((s) => s.setSelectedId);
  const readOnly = useSimStore((s) => s.readOnly);
  const canManipulate = !readOnly && !simRunning;

  const orderedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.position.x - b.position.x),
    [nodes],
  );

  const styledEdges = useMemo(() => {
    return edges.map((e) => {
      const aIdx = orderedNodes.findIndex((n) => n.id === e.source);
      const bIdx = orderedNodes.findIndex((n) => n.id === e.target);
      const minIdx = Math.min(aIdx, bIdx);
      const maxIdx = Math.max(aIdx, bIdx);
      const targetRes = simResult?.nodeResults?.[e.target];
      const edgeActive = simRunning && animStep > 0 && animStep > minIdx;

      let stroke = "#1E293B";
      if (targetRes) stroke = getStatusColor(targetRes.status);
      else if (edgeActive) stroke = "#6EE7B7";

      const strokeWidth = edgeActive || targetRes ? 2.5 : 1.5;

      return {
        ...e,
        style: {
          ...e.style,
          stroke,
          strokeWidth,
          strokeDasharray: edgeActive ? "6 3" : undefined,
          transition: "stroke 0.3s",
        },
        animated: Boolean(edgeActive && !targetRes),
        zIndex: maxIdx,
      };
    });
  }, [edges, orderedNodes, simResult, simRunning, animStep]);

  const onNodeClick = useCallback(
    (_, node) => {
      setSelectedId(node.id);
    },
    [setSelectedId],
  );

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
  }, [setSelectedId]);

  return (
    <div className="relative h-full min-h-0 flex-1 bg-[#020817]">
      <div className="pointer-events-none absolute left-1/2 top-2.5 z-10 max-w-[90vw] -translate-x-1/2 rounded-full border border-slate-800 bg-[#0A0F1E] px-3.5 py-1 text-center text-[10px] tracking-wide text-slate-500">
        {readOnly
          ? "View-only public design · Pan & zoom · Run simulation"
          : "Drag nodes · Connect handles · Click node to inspect"}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={canManipulate}
        nodesConnectable={canManipulate}
        edgesReconnectable={canManipulate}
        elementsSelectable
        deleteKeyCode={canManipulate ? "Backspace" : null}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        className="bg-[#020817]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          color="#1e293b"
        />
        <Controls
          className="!m-3 !overflow-hidden !rounded-lg !border !border-slate-800 !bg-[#0A0F1E] !shadow-none"
          showInteractive={false}
        />
        <MiniMap
          className="!m-3 !rounded-lg !border !border-slate-800 !bg-[#0A0F1E]"
          nodeColor={() => "#334155"}
          maskColor="rgb(2, 8, 23, 0.85)"
        />
      </ReactFlow>
    </div>
  );
}
