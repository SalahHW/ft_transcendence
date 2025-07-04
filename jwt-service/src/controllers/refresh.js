export const refreshToken = async (request, reply) => {
  const token = request.cookies?.token;

  if (!token) {
    return reply.code(401).send({ error: "Token cookie missing" });
  }

  try {
    const payload = await request.server.jwt.verify(token);

    const newToken = await reply.jwtSign(
      {
        sub: payload.sub,
        username: payload.username,
        role: payload.role,
        aud: payload.aud,
        iss: payload.iss,
      },
      { expiresIn: "5m" }
    );

    reply.setCookie("token", newToken, {
      httpOnly: true,
      path: "/",
      sameSite: "Strict",
      secure: true,
      maxAge: 300,
    });

    return reply.code(200).send({ ok: true });
  } catch (err) {
    console.error("Refresh failed:", err);
    return reply.code(401).send({ error: "Invalid or expired token" });
  }
};
