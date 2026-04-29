import { User } from "../models/User.js";
import { verifyAuthToken } from "../utils/auth.js";

function getBearerToken(header = "") {
  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
}

export async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const payload = verifyAuthToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: "Invalid authentication token." });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid authentication token." });
  }
}
