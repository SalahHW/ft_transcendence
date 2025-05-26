import fp from "fastify-plugin";

const jwtServiceUrl = "http://jwt";
const jwtServicePort = 3005;

const baseUrl = `${jwtServiceUrl}:${jwtServicePort}`;
const signUrl = `${baseUrl}/sign`;
const verifyUrl = `${baseUrl}/verify`;

async function signToken(payload) {
  try {
    const response = await fetch(signUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Failed to sign token");

    const data = await response.json();
    return data.token;
  } catch (err) {
    throw new Error(err.message);
  }
}

async function verifyToken(token) {
  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { valid: false, error: "Invalid or expired token" };
    }

    const data = await response.json();
    return { valid: true, decoded: data.decoded };
  } catch (err) {
    return {
      valid: false,
      error: "An error occurred while verifying the token",
    };
  }
}

export default fp(async function (fastify, options) {
  fastify.decorate("signToken", signToken);
  fastify.decorate("verifyToken", verifyToken);
});
