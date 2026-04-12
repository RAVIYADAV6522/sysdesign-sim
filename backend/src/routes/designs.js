import crypto from "crypto";
import express from "express";

import { requireAuth } from "../middleware/auth.js";
import { Design } from "../models/Design.js";

export const designsRouter = express.Router();

function randomNodeId() {
  return `n${crypto.randomBytes(6).toString("hex")}`;
}

function remapFork(design) {
  const idMap = new Map();
  for (const n of design.nodes) {
    idMap.set(n.id, randomNodeId());
  }
  const nodes = design.nodes.map((n) => ({
    ...n,
    id: idMap.get(n.id),
  }));
  const edges = design.edges.map(([a, b]) => [idMap.get(a), idMap.get(b)]);
  return { nodes, edges };
}

/** List current user's designs (doc: GET /designs). */
designsRouter.get("/", requireAuth, async (req, res) => {
  const list = await Design.find({ userId: req.userId })
    .sort({ updatedAt: -1 })
    .select("name isPublic updatedAt createdAt nodes")
    .lean();

  res.json({
    designs: list.map((d) => ({
      id: d._id,
      name: d.name,
      isPublic: d.isPublic,
      updatedAt: d.updatedAt,
      createdAt: d.createdAt,
      nodeCount: Array.isArray(d.nodes) ? d.nodes.length : 0,
    })),
  });
});

/** Create design (doc: POST /designs). */
designsRouter.post("/", requireAuth, async (req, res) => {
  const { name, nodes, edges, traffic, isPublic } = req.body ?? {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  const doc = await Design.create({
    userId: req.userId,
    name: name.trim(),
    nodes: Array.isArray(nodes) ? nodes : [],
    edges: Array.isArray(edges) ? edges : [],
    traffic:
      traffic && typeof traffic === "object"
        ? {
            users: Number(traffic.users) || 0,
            rps: Number(traffic.rps) || 0,
          }
        : { users: 10000, rps: 100 },
    isPublic: Boolean(isPublic),
  });
  res.status(201).json({ design: formatDesign(doc) });
});

/** Public view (doc: GET /designs/:id/public) — must be before "/:id". */
designsRouter.get("/public/:id", async (req, res) => {
  const doc = await Design.findOne({
    _id: req.params.id,
    isPublic: true,
  }).lean();
  if (!doc) {
    return res.status(404).json({ error: "Public design not found" });
  }
  res.json({ design: formatDesign(doc) });
});

/** Fork a public design into the current account. */
designsRouter.post("/:id/fork", requireAuth, async (req, res) => {
  const source = await Design.findById(req.params.id).lean();
  if (!source || !source.isPublic) {
    return res.status(404).json({ error: "Public design not found" });
  }
  const { nodes, edges } = remapFork(source);
  const forked = await Design.create({
    userId: req.userId,
    name: `Copy of ${source.name}`,
    nodes,
    edges,
    traffic: source.traffic || { users: 10000, rps: 100 },
    isPublic: false,
  });
  res.status(201).json({ design: formatDesign(forked) });
});

/** Get owned design (doc: GET /designs/:id). */
designsRouter.get("/:id", requireAuth, async (req, res) => {
  const doc = await Design.findOne({
    _id: req.params.id,
    userId: req.userId,
  }).lean();
  if (!doc) {
    return res.status(404).json({ error: "Design not found" });
  }
  res.json({ design: formatDesign(doc) });
});

/** Update design (doc: PUT /designs/:id). */
designsRouter.put("/:id", requireAuth, async (req, res) => {
  const doc = await Design.findOne({
    _id: req.params.id,
    userId: req.userId,
  });
  if (!doc) {
    return res.status(404).json({ error: "Design not found" });
  }
  const { name, nodes, edges, traffic, isPublic } = req.body ?? {};
  if (name !== undefined) doc.name = String(name).trim();
  if (nodes !== undefined) doc.nodes = nodes;
  if (edges !== undefined) doc.edges = edges;
  if (traffic !== undefined && typeof traffic === "object") {
    if (traffic.users !== undefined) {
      doc.traffic.users = Number(traffic.users);
    }
    if (traffic.rps !== undefined) {
      doc.traffic.rps = Number(traffic.rps);
    }
  }
  if (isPublic !== undefined) doc.isPublic = Boolean(isPublic);
  await doc.save();
  res.json({ design: formatDesign(doc) });
});

/** Delete design (doc: DELETE /designs/:id). */
designsRouter.delete("/:id", requireAuth, async (req, res) => {
  const result = await Design.deleteOne({
    _id: req.params.id,
    userId: req.userId,
  });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Design not found" });
  }
  res.status(204).send();
});

function formatDesign(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: d._id,
    userId: d.userId,
    name: d.name,
    nodes: d.nodes,
    edges: d.edges,
    traffic: d.traffic,
    isPublic: d.isPublic,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}
