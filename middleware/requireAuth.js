// TEMPORARY development-only login check.
// In the JWT phase we will replace this file with real token verification.
export function requireAuth(req, res, next) {
  if (process.env.DEV_AUTH !== "true") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const email = req.headers["x-user-email"];
  const name = req.headers["x-user-name"];

  if (!email) {
    return res
      .status(401)
      .json({ message: "Missing x-user-email header (dev auth)" });
  }

  // Routes read the logged-in user from req.user
  req.user = { email: String(email), name: name ? String(name) : "Dev User" };
  next();
}