import { COMPONENTS } from "../simulation/constants.js";

/** API / Mongo shape (doc Phase 2) → React Flow nodes + edges. */
export function apiDesignToFlow({ nodes, edges, traffic }) {
  const flowNodes = (nodes ?? []).map((n) => ({
    id: n.id,
    type: "system",
    position: { x: n.x, y: n.y },
    data: {
      componentType: n.type,
      failed: Boolean(n.failed),
      label: COMPONENTS[n.type]?.label ?? n.type,
    },
  }));
  const flowEdges = (edges ?? []).map(([a, b], i) => ({
    id: `e-${a}-${b}-${i}`,
    source: a,
    target: b,
  }));
  return {
    nodes: flowNodes,
    edges: flowEdges,
    traffic: traffic ?? { users: 10000, rps: 100 },
  };
}

/** React Flow graph → payload for POST/PUT /api/designs */
export function flowToApiPayload({ nodes, edges, traffic }) {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.componentType,
      x: n.position.x,
      y: n.position.y,
      failed: Boolean(n.data.failed),
    })),
    edges: edges.map((e) => [e.source, e.target]),
    traffic: { ...traffic },
  };
}
