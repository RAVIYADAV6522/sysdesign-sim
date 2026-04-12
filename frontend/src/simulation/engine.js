import { COMPONENTS } from "./constants.js";

export function getStatusColor(status) {
  return (
    {
      healthy: "#6EE7B7",
      stressed: "#FCD34D",
      bottleneck: "#F87171",
      failed: "#6B7280",
    }[status] || "#6EE7B7"
  );
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

/**
 * Pure simulation: per-node load from global RPS vs component capacity (doc §2.2).
 * Edges are accepted for API compatibility but do not change per-node load in Phase 1.
 */
export function runSimulation(nodes, edges, traffic) {
  void edges;
  const { rps } = traffic;
  const results = {};
  let totalLatency = 0;
  const bottlenecks = [];
  const suggestions = [];

  const ordered = [...nodes].sort((a, b) => a.x - b.x);

  ordered.forEach((node) => {
    const def = COMPONENTS[node.type];
    const load = rps / def.capacity;
    let latency = def.baseLatency;
    let status = "healthy";

    if (node.failed) {
      status = "failed";
      latency = 9999;
    } else if (load > 1.0) {
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

    results[node.id] = {
      latency: Math.round(latency),
      status,
      throughput,
      errorRate: Math.round(errorRate),
    };
    totalLatency += latency;
  });

  const totalErrorRate =
    Object.values(results).reduce((a, b) => a + b.errorRate, 0) / nodes.length;
  const effectiveRps =
    bottlenecks.length > 0 ? Math.round(rps * (1 - totalErrorRate / 100)) : rps;

  const healthScore = Math.max(
    0,
    Math.round(100 - bottlenecks.length * 20 - totalErrorRate * 0.5),
  );

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
