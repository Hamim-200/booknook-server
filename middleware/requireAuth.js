import { createRemoteJWKSet, jwtVerify } from "jose";
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

export async function requireAuth(req, res, next) {
  if (!getAuthUrl()) {
    console.error("AUTH_URL is missing in .env");
    return res.status(500).json({ message: "Server login check is not set up" });
  }


  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: getAuthUrl(),
    });

    if (!payload.email) {
      return res.status(401).json({ message: "Invalid token" });
    }
    req.user = {
      email: String(payload.email),
      name: payload.name ? String(payload.name) : "BookNook User",
    };
    next();
  } catch (error) {
    console.warn("Token check failed:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}