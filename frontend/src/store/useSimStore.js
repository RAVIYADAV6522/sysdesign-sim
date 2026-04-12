import { create } from "zustand";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";

import { apiDesignToFlow } from "../lib/designFormat.js";
import { COMPONENTS } from "../simulation/constants.js";
import { runSimulation } from "../simulation/engine.js";
import {
  getDefaultFlowState,
  templateKeyToFlowState,
} from "../simulation/templates.js";

const initialFlow = getDefaultFlowState();

let simulationTick = null;

function clearSimulationTick() {
  if (simulationTick) {
    clearInterval(simulationTick);
    simulationTick = null;
  }
}

let nodeSeq = 100;
function newNodeId() {
  return `n${++nodeSeq}`;
}

function bumpNodeSeqFromNodes(nodes) {
  let max = nodeSeq;
  for (const n of nodes) {
    const m = /^n(\d+)$/.exec(n.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  nodeSeq = max;
}

export const useSimStore = create((set, get) => ({
  nodes: initialFlow.nodes,
  edges: initialFlow.edges,
  traffic: initialFlow.traffic,
  simResult: null,
  simRunning: false,
  animStep: 0,
  selectedId: null,
  activeTab: "components",
  readOnly: false,
  currentDesignId: null,
  designName: "Untitled",

  setActiveTab: (activeTab) => set({ activeTab }),
  setTraffic: (traffic) => set({ traffic }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setDesignName: (designName) => set({ designName }),
  setReadOnly: (readOnly) => set({ readOnly }),

  setDesignMeta: ({ id, name }) =>
    set({
      currentDesignId: id ?? null,
      designName: name ?? "Untitled",
    }),

  /** Load graph from API / Mongo document shape. */
  hydrateFromApiDesign: (design) => {
    clearSimulationTick();
    const flow = apiDesignToFlow(design);
    bumpNodeSeqFromNodes(flow.nodes);
    set({
      nodes: flow.nodes,
      edges: flow.edges,
      traffic: flow.traffic,
      simResult: null,
      selectedId: null,
      animStep: 0,
      simRunning: false,
    });
  },

  resetToNewCanvas: () => {
    clearSimulationTick();
    nodeSeq = 100;
    const initial = getDefaultFlowState();
    set({
      nodes: initial.nodes,
      edges: initial.edges,
      traffic: initial.traffic,
      simResult: null,
      selectedId: null,
      animStep: 0,
      simRunning: false,
      readOnly: false,
      currentDesignId: null,
      designName: "Untitled",
    });
  },

  onNodesChange: (changes) => {
    const { readOnly, simRunning } = get();
    if (readOnly || simRunning) return;
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    const { readOnly, simRunning } = get();
    if (readOnly || simRunning) return;
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const { readOnly, simRunning } = get();
    if (readOnly || simRunning) return;
    const { source, target } = connection;
    if (!source || !target || source === target) return;
    const dup = get().edges.some(
      (e) =>
        (e.source === source && e.target === target) ||
        (e.source === target && e.target === source),
    );
    if (dup) return;
    set({
      edges: addEdge(
        { ...connection, id: `e-${source}-${target}` },
        get().edges,
      ),
      simResult: null,
    });
  },

  loadTemplate: (key) => {
    clearSimulationTick();
    const next = templateKeyToFlowState(key);
    if (!next) return;
    bumpNodeSeqFromNodes(next.nodes);
    set({
      nodes: next.nodes,
      edges: next.edges,
      traffic: next.traffic,
      simResult: null,
      selectedId: null,
      animStep: 0,
      simRunning: false,
      currentDesignId: null,
      designName: "Untitled",
    });
  },

  addComponent: (componentType) => {
    const { readOnly, simRunning } = get();
    if (readOnly || simRunning) return;
    const def = COMPONENTS[componentType];
    if (!def) return;
    const id = newNodeId();
    const node = {
      id,
      type: "system",
      position: { x: 280 + Math.random() * 120, y: 120 + Math.random() * 180 },
      data: { componentType, failed: false, label: def.label },
    };
    set({ nodes: [...get().nodes, node], simResult: null });
  },

  deleteNode: (id) => {
    const { readOnly, simRunning } = get();
    if (readOnly || simRunning) return;
    clearSimulationTick();
    const { nodes, edges, selectedId } = get();
    set({
      nodes: nodes.filter((n) => n.id !== id),
      edges: edges.filter((e) => e.source !== id && e.target !== id),
      selectedId: selectedId === id ? null : selectedId,
      simResult: null,
      simRunning: false,
      animStep: 0,
    });
  },

  toggleFail: (id) => {
    if (get().readOnly || get().simRunning) return;
    set({
      nodes: get().nodes.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, failed: !n.data.failed } }
          : n,
      ),
      simResult: null,
    });
  },

  reset: () => {
    clearSimulationTick();
    set((s) => ({
      simResult: null,
      animStep: 0,
      simRunning: false,
      nodes: s.nodes.map((n) => ({
        ...n,
        data: { ...n.data, failed: false },
      })),
    }));
  },

  simulate: () => {
    const { nodes } = get();
    if (nodes.length < 2) return;
    clearSimulationTick();
    set({ simRunning: true, animStep: 0, simResult: null });

    const orderedLen = [...nodes].sort(
      (a, b) => a.position.x - b.position.x,
    ).length;

    let step = 0;
    simulationTick = setInterval(() => {
      step += 1;
      set({ animStep: step });
      if (step >= orderedLen) {
        clearSimulationTick();
        const snap = get();
        const simNodes = snap.nodes.map((n) => ({
          id: n.id,
          type: n.data.componentType,
          x: n.position.x,
          y: n.position.y,
          failed: Boolean(n.data.failed),
        }));
        const edgePairs = snap.edges.map((e) => [e.source, e.target]);
        const result = runSimulation(simNodes, edgePairs, snap.traffic);
        set({ simResult: result, simRunning: false });
      }
    }, 220);
  },
}));
