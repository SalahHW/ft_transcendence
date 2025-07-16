export async function invalidateToken(request, reply) {
  const token = request.cookies?.accessToken;

  if (!token) return;
  const { redis } = request.server;

  let expirationTime;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    expirationTime = payload.exp;
    console.log(expirationTime);
  } catch (err) {
    return;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const ttl = expirationTime - currentTime;

  if (ttl <= 0) return;

  const key = `blacklist:${token}`;
  redis
    .setex(key, ttl, "invalid")
    .then(() => console.log("Token blacklisted"))
    .catch((err) => console.log("Failed to blacklist token:", err.message));
}
