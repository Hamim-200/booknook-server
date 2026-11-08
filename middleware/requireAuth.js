import { createRemoteJWKSet, jwtVerify } from "jose";

// The public keys from Better Auth, created once and then reused.
// "jose" downloads them the first time and caches them.
let jwks;

function getAuthUrl() {
  return (process.env.AUTH_URL || "").replace(/\/$/, "");
}

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${getAuthUrl()}/api/auth/jwks`));
  }
  return jwks;
}

// Protects a route: only requests with a valid token get through.
// The routes read the logged-in user from req.user.
export async function requireAuth(req, res, next) {
  if (!getAuthUrl()) {
    console.error("AUTH_URL is missing in .env");
    return res.status(500).json({ message: "Server login check is not set up" });
  }

  // The token arrives as:  Authorization: Bearer <token>
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    // Checks the signature, the expiry time, and who issued the token
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: getAuthUrl(),
    });

    if (!payload.email) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Name and email now come from the verified token, never from the client
    req.user = {
      email: String(payload.email),
      name: payload.name ? String(payload.name) : "BookNook User",
    };
    next();
  } catch (error) {
    // The reason is only printed here, so the client never sees the details
    console.warn("Token check failed:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}