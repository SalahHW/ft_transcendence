export const verifyToken = async (request, reply) => {
  try {
    const decoded = await request.jwtVerify();
    reply.statusCode = 200;
    reply.send({ decoded });
  } catch (err) {
    console.error(err);
    reply.statusCode = 401;
    reply.send({ error: "Invalid token", cause: err.message });
  }
};
