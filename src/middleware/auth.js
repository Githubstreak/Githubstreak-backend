import { createClerkClient } from "@clerk/clerk-sdk-node";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Middleware to verify Clerk JWT tokens
 * Extracts userId from token and attaches to req.auth
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: true,
        message: "Missing or invalid Authorization header",
        code: "UNAUTHORIZED",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify the token with Clerk
    const { sub: userId } = await clerkClient.verifyToken(token);

    if (!userId) {
      return res.status(401).json({
        error: true,
        message: "Invalid token",
        code: "UNAUTHORIZED",
      });
    }

    // Attach userId to request for use in controllers
    req.auth = { userId };
    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({
      error: true,
      message: "Authentication failed",
      code: "UNAUTHORIZED",
    });
  }
};

/**
 * Optional auth - attaches userId if token present, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { sub: userId } = await clerkClient.verifyToken(token);
      req.auth = { userId };
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }
  next();
};
