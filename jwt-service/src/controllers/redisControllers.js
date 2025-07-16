export async function checkBlacklistedTokens(request, reply) {
  const authHeader = request.headers?.authorization;

  if (!authHeader) return;

  if (!authHeader.startsWith("Bearer ")) return;
  const token = authHeader.substring(7);

  if (!token) return;
  console.log(token);

  const { redis } = request.server;

  let isBlacklisted;
  try {
    isBlacklisted = await redis.get(`blacklist:${token}`);
  } catch (err) {
    console.error(err.message);
    return;
  }
  console.log(isBlacklisted);
  if (isBlacklisted) {
    return reply.code(401).send({ error: "Blacklisted token" });
  }
}
