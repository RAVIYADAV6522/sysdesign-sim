import { useState, useCallback, useRef } from "react";

// --- COMPONENT DEFINITIONS ---------------------------------------------------

const COMPONENTS = {
  client: {
    type: "client", label: "Client", icon: "⬡",
    color: "#6EE7B7", bg: "#064E3B",
    baseLatency: 0, capacity: Infinity,
    description: "User requests origin"
  },
  loadBalancer: {
    type: "loadBalancer", label: "Load Balancer", icon: "⚖",
    color: "#FCD34D", bg: "#78350F",
    baseLatency: 5, capacity: 10000,
    description: "Distributes traffic across servers"
  },
  server: {
    type: "server", label: "App Server", icon: "▣",
    color: "#93C5FD", bg: "#1E3A5F",
    baseLatency: 50, capacity: 1000,
    description: "Processes application logic"
  },
  cache: {
    type: "cache", label: "Cache", icon: "◈",
    color: "#F9A8D4", bg: "#500724",
    baseLatency: 5, capacity: 8000,
    description: "In-memory fast data store (Redis)"
  },
  database: {
    type: "database", label: "Database", icon: "◎",
    color: "#A78BFA", bg: "#2E1065",
    baseLatency: 200, capacity: 500,
    description: "Persistent data storage"
  },
  cdn: {
    type: "cdn", label: "CDN", icon: "◉",
    color: "#6EE7F7", bg: "#0C4A6E",
    baseLatency: 2, capacity: 50000,
    description: "Global content delivery network"
  },
  queue: {
    type: "queue", label: "Message Queue", icon: "≡",
    color: "#FBB06A", bg: "#7C2D12",
    baseLatency: 20, capacity: 20000,
    description: "Async message buffer (Kafka/RabbitMQ)"
  },
  microservice: {
    type: "microservice", label: "Microservice", icon: "⬡",
    color: "#86EFAC", bg: "#14532D",
    baseLatency: 40, capacity: 800,
    description: "Independent service unit"
  },
};

// --- TEMPLATES ---------------------------------------------------------------

const TEMPLATES = {
  basic: {
    name: "Basic Web App",
    description: "Simple client -> server -> database",
    nodes: [
      { id: "n1", type: "client", x: 80, y: 200 },
      { id: "n2", type: "server", x: 320, y: 200 },
      { id: "n3", type: "database", x: 560, y: 200 },
    ],
    edges: [["n1", "n2"], ["n2", "n3"]],
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
    edges: [["n1", "n2"], ["n2", "n3"], ["n2", "n4"], ["n3", "n5"], ["n4", "n5"], ["n5", "n6"]],
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
    edges: [["n1", "n2"], ["n1", "n3"], ["n3", "n4"], ["n4", "n5"], ["n4", "n6"], ["n5", "n7"], ["n6", "n7"]],
    traffic: { users: 500000, rps: 5000 },
  },
};

// --- SIMULATION ENGINE -------------------------------------------------------

function runSimulation(nodes, edges, traffic) {
  const { rps } = traffic;
  const results = {};
  let totalLatency = 0;
  let bottlenecks = [];
  let suggestions = [];

  // Build adjacency for ordering
  const nodeMap = {};
  nodes.forEach((n) => { nodeMap[n.id] = n; });

  // Find traversal order (topological-ish: left to right by x)
  const ordered = [...nodes].sort((a, b) => a.x - b.x);

  // Simulate each node
  ordered.forEach((node) => {
    const def = COMPONENTS[node.type];
    const load = rps / def.capacity; // 0 to N
    let latency = def.baseLatency;
    let status = "healthy"; // healthy | stressed | bottleneck | failed

    if (node.failed) {
      status = "failed";
      latency = 9999;
    } else if (load > 1.0) {
      // Overloaded: exponential penalty
      const overload = load - 1.0;
      latency = def.baseLatency * (1 + overload * 3);
      status = "bottleneck";
      bottlenecks.push(node.id);
      suggestions.push({
        nodeId: node.id,
        message: getSuggestion(node.type, load),
      });
    } else if (load > 0.7) {
      latency = def.baseLatency * (1 + (load - 0.7) * 1.5);
      status = "stressed";
    }

    const throughput = Math.min(rps, def.capacity);
    const errorRate = node.failed ? 100 : load > 1 ? Math.min(95, (load - 1) * 40) : 0;

    results[node.id] = { latency: Math.round(latency), status, throughput, errorRate: Math.round(errorRate) };
    totalLatency += latency;
  });

  const totalErrorRate = Object.values(results).reduce((a, b) => a + b.errorRate, 0) / nodes.length;
  const effectiveRps = bottlenecks.length > 0
    ? Math.round(rps * (1 - totalErrorRate / 100))
    : rps;

  // Health score
  const healthScore = Math.max(0, Math.round(100 - (bottlenecks.length * 20) - (totalErrorRate * 0.5)));

  return {
    nodeResults: results,
    totalLatency: Math.round(totalLatency),
    effectiveRps,
    errorRate: Math.round(totalErrorRate),
    bottlenecks,
    suggestions,
    healthScore,
  };
}

function getSuggestion(type, load) {
  const suggestions = {
    server: `App Server is at ${Math.round(load * 100)}% capacity. Add more servers behind a Load Balancer.`,
    database: `Database is overloaded at ${Math.round(load * 100)}% capacity. Add a Cache layer or Read Replica.`,
    cache: "Cache is saturated. Increase cache size or add more cache nodes.",
    loadBalancer: "Load Balancer near limit. Consider a DNS-level load balancing strategy.",
    queue: "Message Queue backing up. Add more consumers/workers.",
    microservice: "Microservice overloaded. Scale horizontally with more instances.",
    cdn: "CDN at high load - check origin server capacity.",
    client: "Unexpected client overload - check rate limiting.",
  };
  return suggestions[type] || `${type} is overloaded. Consider scaling.`;
}

// --- HELPERS -----------------------------------------------------------------

function getStatusColor(status) {
  return {
    healthy: "#6EE7B7",
    stressed: "#FCD34D",
    bottleneck: "#F87171",
    failed: "#6B7280",
  }[status] || "#6EE7B7";
}

let nodeCounter = 100;
function newId() { return `n${++nodeCounter}`; }

// --- MAIN APP ----------------------------------------------------------------

export default function App() {
  const [nodes, setNodes] = useState(TEMPLATES.basic.nodes);
  const [edges, setEdges] = useState(TEMPLATES.basic.edges);
  const [traffic, setTraffic] = useState(TEMPLATES.basic.traffic);
  const [simResult, setSimResult] = useState(null);
  const [simRunning, setSimRunning] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [connecting, setConnecting] = useState(null); // {fromId}
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState("components"); // components | templates
  const [animStep, setAnimStep] = useState(0);
  const canvasRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // -- Load template
  const loadTemplate = (key) => {
    const t = TEMPLATES[key];
    setNodes(t.nodes);
    setEdges(t.edges);
    setTraffic(t.traffic);
    setSimResult(null);
    setSelectedNode(null);
    setConnecting(null);
  };

  // -- Add node from sidebar
  const addNode = (type) => {
    const newNode = { id: newId(), type, x: 300 + Math.random() * 100, y: 150 + Math.random() * 150 };
    setNodes((prev) => [...prev, newNode]);
  };

  // -- Drag
  const onNodeMouseDown = (e, nodeId) => {
    if (connecting) return;
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    const rect = canvasRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y };
    setDragging(nodeId);
    setSelectedNode(nodeId);
  };

  const onCanvasMouseMove = (e) => {
    if (!dragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.current.x;
    const y = e.clientY - rect.top - dragOffset.current.y;
    setNodes((prev) => prev.map((n) => n.id === dragging ? { ...n, x: Math.max(20, Math.min(x, 860)), y: Math.max(20, Math.min(y, 420)) } : n));
  };

  const onCanvasMouseUp = () => { setDragging(null); };

  // -- Connect nodes
  const onPortClick = (e, nodeId) => {
    e.stopPropagation();
    if (!connecting) {
      setConnecting(nodeId);
    } else {
      if (connecting !== nodeId) {
        const exists = edges.some(([a, b]) => (a === connecting && b === nodeId) || (a === nodeId && b === connecting));
        if (!exists) setEdges((prev) => [...prev, [connecting, nodeId]]);
      }
      setConnecting(null);
    }
  };

  // -- Delete node
  const deleteNode = (id) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter(([a, b]) => a !== id && b !== id));
    setSelectedNode(null);
    setSimResult(null);
  };

  // -- Toggle failure
  const toggleFail = (id) => {
    setNodes((prev) => prev.map((n) => n.id === id ? { ...n, failed: !n.failed } : n));
    setSimResult(null);
  };

  // -- Run simulation
  const simulate = () => {
    if (nodes.length < 2) return;
    setSimRunning(true);
    setAnimStep(0);

    // Animate steps
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setAnimStep(step);
      if (step >= nodes.length) {
        clearInterval(interval);
        const result = runSimulation(nodes, edges, traffic);
        setSimResult(result);
        setSimRunning(false);
      }
    }, 220);
  };

  // -- Reset
  const reset = () => {
    setSimResult(null);
    setAnimStep(0);
    setNodes((prev) => prev.map((n) => ({ ...n, failed: false })));
  };

  const selectedNodeData = nodes.find((n) => n.id === selectedNode);
  const orderedNodes = [...nodes].sort((a, b) => a.x - b.x);

  return (
    <div style={styles.root}>
      {/* -- HEADER */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>◈ SysDesign</span>
          <span style={styles.logoSub}>Simulator</span>
        </div>
        <div style={styles.headerCenter}>
          {simResult && (
            <div style={styles.scoreRow}>
              <ScorePill label="Health" value={`${simResult.healthScore}/100`} color={simResult.healthScore > 70 ? "#6EE7B7" : simResult.healthScore > 40 ? "#FCD34D" : "#F87171"} />
              <ScorePill label="Latency" value={`${simResult.totalLatency}ms`} color="#93C5FD" />
              <ScorePill label="Throughput" value={`${simResult.effectiveRps} rps`} color="#F9A8D4" />
              <ScorePill label="Error Rate" value={`${simResult.errorRate}%`} color={simResult.errorRate > 10 ? "#F87171" : "#6EE7B7"} />
            </div>
          )}
        </div>
        <div style={styles.headerRight}>
          <button style={styles.btnSecondary} onClick={reset}>Reset</button>
          <button
            style={{ ...styles.btnPrimary, opacity: simRunning ? 0.6 : 1 }}
            onClick={simulate}
            disabled={simRunning}
          >
            {simRunning ? "Simulating..." : "▶ Simulate"}
          </button>
        </div>
      </header>

      <div style={styles.body}>
        {/* -- LEFT SIDEBAR */}
        <aside style={styles.sidebar}>
          <div style={styles.tabs}>
            <button style={activeTab === "components" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("components")}>Components</button>
            <button style={activeTab === "templates" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("templates")}>Templates</button>
          </div>

          {activeTab === "components" && (
            <div style={styles.compList}>
              <p style={styles.sideLabel}>Click to add to canvas</p>
              {Object.values(COMPONENTS).map((c) => (
                <button key={c.type} style={styles.compItem} onClick={() => addNode(c.type)}>
                  <span style={{ ...styles.compIcon, background: c.bg, color: c.color }}>{c.icon}</span>
                  <div>
                    <div style={styles.compName}>{c.label}</div>
                    <div style={styles.compDesc}>{c.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === "templates" && (
            <div style={styles.compList}>
              <p style={styles.sideLabel}>Load a preset architecture</p>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button key={key} style={styles.templateItem} onClick={() => loadTemplate(key)}>
                  <div style={styles.compName}>{t.name}</div>
                  <div style={styles.compDesc}>{t.description}</div>
                </button>
              ))}
            </div>
          )}

          {/* Traffic Config */}
          <div style={styles.trafficBox}>
            <p style={styles.sideLabel}>Traffic Parameters</p>
            <label style={styles.inputLabel}>Users</label>
            <input style={styles.input} type="number" value={traffic.users}
              onChange={(e) => setTraffic((p) => ({ ...p, users: +e.target.value }))} />
            <label style={styles.inputLabel}>Requests / Second</label>
            <input style={styles.input} type="number" value={traffic.rps}
              onChange={(e) => setTraffic((p) => ({ ...p, rps: +e.target.value }))} />
          </div>
        </aside>

        {/* -- CANVAS */}
        <main style={styles.canvasWrap}>
          <div style={styles.canvasHint}>
            {connecting
              ? "🔗 Click another node to connect from selected"
              : "Drag nodes · Click ⊕ to connect · Click node to select"}
          </div>

          <svg
            ref={canvasRef}
            style={styles.canvas}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onClick={() => { setSelectedNode(null); setConnecting(null); }}
          >
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#334155" />
              </marker>
            </defs>

            {/* Edges */}
            {edges.map(([a, b], i) => {
              const na = nodes.find((n) => n.id === a);
              const nb = nodes.find((n) => n.id === b);
              if (!na || !nb) return null;
              const ax = na.x + 56; const ay = na.y + 28;
              const bx = nb.x; const by = nb.y + 28;

              const isActive = simRunning && animStep > 0;
              const aIdx = orderedNodes.findIndex((n) => n.id === a);
              const bIdx = orderedNodes.findIndex((n) => n.id === b);
              const edgeActive = isActive && animStep > Math.min(aIdx, bIdx);

              const resB = simResult?.nodeResults?.[b];
              const edgeColor = resB
                ? getStatusColor(resB.status)
                : edgeActive ? "#6EE7B7" : "#1E293B";

              return (
                <g key={i}>
                  <path
                    d={`M${ax},${ay} C${ax + 60},${ay} ${bx - 60},${by} ${bx},${by}`}
                    fill="none" stroke={edgeColor} strokeWidth={edgeActive || resB ? 2.5 : 1.5}
                    strokeDasharray={edgeActive ? "6 3" : "none"}
                    markerEnd="url(#arrow)"
                    style={{ transition: "stroke 0.3s" }}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const def = COMPONENTS[node.type];
              const res = simResult?.nodeResults?.[node.id];
              const isSelected = selectedNode === node.id;
              const isConnectSrc = connecting === node.id;
              const isAnimating = simRunning && animStep > orderedNodes.findIndex((n) => n.id === node.id);
              const statusColor = res ? getStatusColor(res.status) : isAnimating ? "#FCD34D" : "#334155";
              const isFailed = node.failed;

              return (
                <g key={node.id} transform={`translate(${node.x},${node.y})`}
                  onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                  style={{ cursor: dragging === node.id ? "grabbing" : "grab" }}>

                  {/* Glow */}
                  {(isSelected || res?.status === "bottleneck") && (
                    <rect x="-4" y="-4" width="120" height="64" rx="14"
                      fill="none" stroke={res?.status === "bottleneck" ? "#F87171" : "#6EE7B7"}
                      strokeWidth="2" opacity="0.6"
                      style={{ filter: "blur(2px)" }} />
                  )}

                  {/* Card */}
                  <rect width="112" height="56" rx="10"
                    fill={isFailed ? "#111827" : def.bg}
                    stroke={isConnectSrc ? "#FCD34D" : statusColor}
                    strokeWidth={isSelected || res ? 2 : 1}
                    style={{ transition: "all 0.3s" }}
                  />

                  {/* Status bar */}
                  {res && (
                    <rect x="0" y="46" width="112" height="10" rx="0"
                      fill={statusColor} opacity="0.7"
                      style={{ borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }} />
                  )}

                  {/* Icon */}
                  <text x="14" y="28" fontSize="18" fill={isFailed ? "#4B5563" : def.color}
                    style={{ userSelect: "none", fontFamily: "monospace" }}>{isFailed ? "✕" : def.icon}</text>

                  {/* Label */}
                  <text x="36" y="22" fontSize="10" fontWeight="700" fill={isFailed ? "#4B5563" : "#F1F5F9"}
                    style={{ userSelect: "none", fontFamily: "monospace", letterSpacing: 0.5 }}>
                    {def.label.toUpperCase()}
                  </text>

                  {/* Latency */}
                  {res && (
                    <text x="36" y="36" fontSize="9" fill={statusColor}
                      style={{ userSelect: "none", fontFamily: "monospace" }}>
                      {res.latency}ms · {res.status}
                    </text>
                  )}
                  {!res && !isFailed && (
                    <text x="36" y="36" fontSize="10" fontWeight="700" fill="#FFFFFF" 
                      style={{ userSelect: "none", fontFamily: "monospace" }}>
                      {def.baseLatency}ms base
                    </text>
                  )}

                  {/* Connect port */}
                  <circle cx="112" cy="28" r="7" fill={isConnectSrc ? "#FCD34D" : "#0F172A"}
                    stroke={isConnectSrc ? "#FCD34D" : "#334155"} strokeWidth="1.5"
                    onClick={(e) => onPortClick(e, node.id)}
                    style={{ cursor: "crosshair" }}
                  />
                  <text x="112" y="32" fontSize="10" textAnchor="middle" fill={isConnectSrc ? "#000" : "#94A3B8"}
                    onClick={(e) => onPortClick(e, node.id)} style={{ cursor: "crosshair", userSelect: "none" }}>⊕</text>
                </g>
              );
            })}
          </svg>
        </main>

        {/* -- RIGHT PANEL */}
        <aside style={styles.rightPanel}>
          {selectedNodeData && (
            <div style={styles.nodeDetail}>
              <div style={styles.nodeDetailHeader}>
                <span style={{ color: COMPONENTS[selectedNodeData.type].color, fontSize: 20 }}>
                  {COMPONENTS[selectedNodeData.type].icon}
                </span>
                <span style={styles.nodeDetailName}>{COMPONENTS[selectedNodeData.type].label}</span>
              </div>

              {simResult?.nodeResults?.[selectedNode] && (() => {
                const r = simResult.nodeResults[selectedNode];
                return (
                  <div style={styles.metricGrid}>
                    <Metric label="Latency" value={`${r.latency}ms`} color={getStatusColor(r.status)} />
                    <Metric label="Status" value={r.status} color={getStatusColor(r.status)} />
                    <Metric label="Throughput" value={`${r.throughput} rps`} color="#93C5FD" />
                    <Metric label="Error Rate" value={`${r.errorRate}%`} color={r.errorRate > 0 ? "#F87171" : "#6EE7B7"} />
                  </div>
                );
              })()}

              <div style={styles.nodeActions}>
                <button style={styles.btnDanger} onClick={() => toggleFail(selectedNode)}>
                  {selectedNodeData.failed ? "↑ Restore Node" : "💥 Simulate Failure"}
                </button>
                <button style={styles.btnDelete} onClick={() => deleteNode(selectedNode)}>
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {simResult?.suggestions?.length > 0 && (
            <div style={styles.suggestBox}>
              <p style={styles.suggestTitle}>⚡ Optimization Suggestions</p>
              {simResult.suggestions.map((s, i) => {
                const node = nodes.find((n) => n.id === s.nodeId);
                const def = node ? COMPONENTS[node.type] : null;
                return (
                  <div key={i} style={styles.suggestItem}>
                    <span style={{ color: def?.color || "#F87171", marginRight: 6 }}>▸</span>
                    {s.message}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          {!simResult && (
            <div style={styles.legendBox}>
              <p style={styles.suggestTitle}>Node Status Legend</p>
              {[["healthy", "#6EE7B7", "Load < 70%"], ["stressed", "#FCD34D", "Load 70-100%"], ["bottleneck", "#F87171", "Load > 100%"], ["failed", "#6B7280", "Manually failed"]].map(([s, c, d]) => (
                <div key={s} style={styles.legendItem}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block", marginRight: 8 }} />
                  <span style={{ color: "#94A3B8", fontSize: 12 }}><b style={{ color: c }}>{s}</b> - {d}</span>
                </div>
              ))}
              <p style={{ ...styles.sideLabel, marginTop: 16 }}>
                Click ⊕ on a node to start connecting. Click another node to complete the connection.
              </p>
            </div>
          )}

          {/* Latency Breakdown */}
          {simResult && nodes.length > 0 && (
            <div style={styles.chartBox}>
              <p style={styles.suggestTitle}>Latency Breakdown</p>
              {orderedNodes.map((n) => {
                const res = simResult.nodeResults[n.id];
                const def = COMPONENTS[n.type];
                const maxL = Math.max(...orderedNodes.map((x) => simResult.nodeResults[x.id]?.latency || 0));
                const pct = maxL > 0 ? (res?.latency / maxL) * 100 : 0;
                return (
                  <div key={n.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: def.color, fontFamily: "monospace" }}>{def.label}</span>
                      <span style={{ fontSize: 11, color: getStatusColor(res?.status), fontFamily: "monospace" }}>{res?.latency}ms</span>
                    </div>
                    <div style={{ height: 6, background: "#0F172A", borderRadius: 3 }}>
                      <div style={{ height: 6, width: `${pct}%`, background: getStatusColor(res?.status), borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ----------------------------------------------------------

function ScorePill({ label, value, color }) {
  return (
    <div style={{ textAlign: "center", padding: "4px 12px", background: "#0F172A", borderRadius: 8, border: `1px solid ${color}22` }}>
      <div style={{ fontSize: 9, color: "#64748B", fontFamily: "monospace", letterSpacing: 1 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 14, color, fontFamily: "monospace", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div style={{ background: "#0F172A", borderRadius: 8, padding: "8px 10px" }}>
      <div style={{ fontSize: 9, color: "#64748B", fontFamily: "monospace", letterSpacing: 1 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 15, color, fontFamily: "monospace", fontWeight: 700, marginTop: 2 }}>{value}</div>
    </div>
  );
}

// --- STYLES ------------------------------------------------------------------

const styles = {
  root: { display: "flex", flexDirection: "column", height: "100vh", background: "#020817", color: "#E2E8F0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, background: "#0A0F1E", borderBottom: "1px solid #1E293B", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "baseline", gap: 6 },
  logo: { fontSize: 18, fontWeight: 800, color: "#6EE7B7", letterSpacing: -0.5 },
  logoSub: { fontSize: 11, color: "#334155", letterSpacing: 2, textTransform: "uppercase" },
  headerCenter: { flex: 1, display: "flex", justifyContent: "center" },
  scoreRow: { display: "flex", gap: 8 },
  headerRight: { display: "flex", gap: 8 },
  btnPrimary: { background: "#6EE7B7", color: "#022C22", border: "none", borderRadius: 7, padding: "7px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "monospace", letterSpacing: 0.5 },
  btnSecondary: { background: "transparent", color: "#94A3B8", border: "1px solid #1E293B", borderRadius: 7, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "monospace" },
  btnDanger: { background: "#450A0A", color: "#FCA5A5", border: "1px solid #7F1D1D", borderRadius: 7, padding: "8px 12px", fontSize: 11, cursor: "pointer", fontFamily: "monospace", width: "100%" },
  btnDelete: { background: "#1E293B", color: "#94A3B8", border: "1px solid #334155", borderRadius: 7, padding: "8px 12px", fontSize: 11, cursor: "pointer", fontFamily: "monospace", marginTop: 6, width: "100%" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: 220, background: "#0A0F1E", borderRight: "1px solid #1E293B", display: "flex", flexDirection: "column", overflow: "hidden" },
  tabs: { display: "flex", borderBottom: "1px solid #1E293B" },
  tab: { flex: 1, padding: "10px 0", background: "transparent", border: "none", color: "#475569", fontSize: 11, cursor: "pointer", fontFamily: "monospace", letterSpacing: 0.5 },
  tabActive: { flex: 1, padding: "10px 0", background: "transparent", border: "none", borderBottom: "2px solid #6EE7B7", color: "#6EE7B7", fontSize: 11, cursor: "pointer", fontFamily: "monospace", letterSpacing: 0.5 },
  compList: { flex: 1, overflowY: "auto", padding: "8px 0" },
  sideLabel: { fontSize: 9, color: "#334155", letterSpacing: 1.5, textTransform: "uppercase", padding: "6px 12px 4px", margin: 0 },
  compItem: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "7px 12px", background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer", textAlign: "left", transition: "background 0.15s" },
  compIcon: { width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, textAlign: "center", lineHeight: "30px" },
  compName: { fontSize: 11, fontWeight: 700, color: "#CBD5E1", fontFamily: "monospace" },
  compDesc: { fontSize: 9, color: "#475569", marginTop: 1, fontFamily: "monospace" },
  templateItem: { width: "100%", padding: "10px 12px", background: "transparent", border: "none", borderBottom: "1px solid #0F172A", color: "#94A3B8", cursor: "pointer", textAlign: "left" },
  trafficBox: { padding: "12px", borderTop: "1px solid #1E293B" },
  inputLabel: { display: "block", fontSize: 9, color: "#475569", letterSpacing: 1, marginBottom: 3, marginTop: 8, textTransform: "uppercase" },
  input: { width: "100%", background: "#0F172A", border: "1px solid #1E293B", borderRadius: 6, padding: "6px 8px", color: "#E2E8F0", fontSize: 12, fontFamily: "monospace", boxSizing: "border-box", outline: "none" },
  canvasWrap: { flex: 1, position: "relative", overflow: "hidden", background: "#020817" },
  canvasHint: { position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", background: "#0A0F1E", border: "1px solid #1E293B", borderRadius: 20, padding: "4px 14px", fontSize: 10, color: "#475569", letterSpacing: 0.5, zIndex: 10, whiteSpace: "nowrap" },
  canvas: { width: "100%", height: "100%", cursor: "default" },
  rightPanel: { width: 240, background: "#0A0F1E", borderLeft: "1px solid #1E293B", overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 },
  nodeDetail: { background: "#0F172A", borderRadius: 10, padding: 12, border: "1px solid #1E293B" },
  nodeDetailHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  nodeDetailName: { fontSize: 13, fontWeight: 700, color: "#E2E8F0", fontFamily: "monospace" },
  metricGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 },
  nodeActions: { display: "flex", flexDirection: "column", gap: 4 },
  suggestBox: { background: "#0F172A", borderRadius: 10, padding: 12, border: "1px solid #1E293B" },
  suggestTitle: { fontSize: 9, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 8px" },
  suggestItem: { fontSize: 11, color: "#94A3B8", marginBottom: 8, lineHeight: 1.5 },
  legendBox: { background: "#0F172A", borderRadius: 10, padding: 12, border: "1px solid #1E293B" },
  legendItem: { display: "flex", alignItems: "center", marginBottom: 6 },
  chartBox: { background: "#0F172A", borderRadius: 10, padding: 12, border: "1px solid #1E293B" },
};