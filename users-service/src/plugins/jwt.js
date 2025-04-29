import fp from "fastify-plugin";

const jwtServiceUrl = "http://jwt";
const jwtServicePort = 3000;

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

    if (!response.ok) {
      // throw new Error("Failed to sign token");
      return null;
    }

    const data = await response.json();
    console.log(data);
    return data.token;
  } catch (err) {
    console.error("Error signing token: ", err);
    // throw new Error("Authentication service unavailable");
    return null;
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
      throw new Error("Invalid or expired token");
    }

    const data = await response.json();
    return data.decoded;
  } catch (err) {
    console.error("Error verifying token: ", err);
    throw new Error("Invalid or expired token");
  }
}

export default fp(async function (fastify, options) {
  fastify.decorate("signToken", signToken);
  fastify.decorate("verifyToken", verifyToken);
});
