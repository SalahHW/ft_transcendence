export const signToken = async (request, reply) => {
  const payload = request.body;

  if (!payload) {
    reply.statusCode = 400;
    reply.send({ error: "Payload is empty" });
    return;
  }

  try {
    const token = await reply.jwtSign(payload);
    reply.statusCode = 200;
    reply.send({ token });
  } catch (err) {
    console.error(err);
    reply.statusCode = 500;
    reply.send({ error: "Failed to generate token" });
  }
};
