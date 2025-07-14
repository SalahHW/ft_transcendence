import { verifyToken, signAccessToken } from "../plugins/jwt.js";

export const refreshAccessToken = async (request, reply) => {
  const refreshToken = request.cookies.refresh_token;

  if (!refreshToken) {
    return reply.code(401).send({ error: "Missing refresh token" });
  }

  let verificationResult;
  try {
    verificationResult = await verifyToken(refreshToken);
  } catch (err) {
    console.error("Error verifying refresh token:", err.message);
    return reply.code(500).send({ error: "Token verification failed" });
  }

  const { valid, decoded, error } = verificationResult;

  if (!valid || decoded?.role !== "refresh_token") {
    console.warn("Refresh token invalid:", error || decoded);
    return reply.code(401).send({ error: "Invalid or expired refresh token" });
  }

  try {
    const accessToken = await signAccessToken({
      sub: decoded.sub,
      username: decoded.username,
      aud: "users-service",
    });

    reply.setCookie("access_token", accessToken, {
      path: "/",
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 300,
    });

    return reply.code(200).send({ ok: true });
  } catch (err) {
    console.error("Failed to sign access token:", err.message);
    return reply
      .code(500)
      .send({ error: "Failed to refresh access token", cause: err.message });
  }
};
