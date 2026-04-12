import { COMPONENTS } from "./constants.js";

/** Preset graphs: node layout + edges + default traffic (Phase 1 doc). */
export const TEMPLATES = {
  basic: {
    name: "Basic Web App",
    description: "Simple client -> server -> database",
    nodes: [
      { id: "n1", type: "client", x: 80, y: 200 },
      { id: "n2", type: "server", x: 320, y: 200 },
      { id: "n3", type: "database", x: 560, y: 200 },
    ],
    edges: [
      ["n1", "n2"],
      ["n2", "n3"],
    ],
    traffic: { users: 10000, rps: 100 },
  },
  scalable: {
    name: "Scalable System",
    description: "With load balancer and cache",
    nodes: [
      { id: "n1", type: "client", x: 60, y: 220 },
      { id: "n2", type: "loadBalancer", x: 260, y: 220 },
      { id: "n3", type: "server", x: 460, y: 120 },
      { id: "n4", type: "server", x: 460, y: 320 },
      { id: "n5", type: "cache", x: 660, y: 180 },
      { id: "n6", type: "database", x: 660, y: 320 },
    ],
    edges: [
      ["n1", "n2"],
      ["n2", "n3"],
      ["n2", "n4"],
      ["n3", "n5"],
      ["n4", "n5"],
      ["n5", "n6"],
    ],
    traffic: { users: 100000, rps: 1000 },
  },
  whatsapp: {
    name: "WhatsApp-like",
    description: "Messaging system with queue",
    nodes: [
      { id: "n1", type: "client", x: 60, y: 220 },
      { id: "n2", type: "cdn", x: 240, y: 100 },
      { id: "n3", type: "loadBalancer", x: 240, y: 280 },
      { id: "n4", type: "server", x: 440, y: 220 },
      { id: "n5", type: "queue", x: 620, y: 150 },
      { id: "n6", type: "microservice", x: 620, y: 300 },
      { id: "n7", type: "database", x: 800, y: 220 },
    ],
    edges: [
      ["n1", "n2"],
      ["n1", "n3"],
      ["n3", "n4"],
      ["n4", "n5"],
      ["n4", "n6"],
      ["n5", "n7"],
      ["n6", "n7"],
    ],
    traffic: { users: 500000, rps: 5000 },
  },
};

export function templateKeyToFlowState(key) {
  const t = TEMPLATES[key];
  if (!t) return null;
  const nodes = t.nodes.map((n) => ({
    id: n.id,
    type: "system",
    position: { x: n.x, y: n.y },
    data: { componentType: n.type, label: COMPONENTS[n.type]?.label ?? n.type },
  }));
  const edges = t.edges.map(([a, b], i) => ({
    id: `e-${a}-${b}-${i}`,
    source: a,
    target: b,
  }));
  return { nodes, edges, traffic: { ...t.traffic } };
}

export function getDefaultFlowState() {
  return templateKeyToFlowState("basic");
}
