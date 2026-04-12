import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-change-me";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signUserToken(userId) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: "7d" });
}
