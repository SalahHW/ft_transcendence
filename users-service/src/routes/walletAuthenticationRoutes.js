import * as walletAuthenticationControllers from "../controllers/walletAuthenticationControllers.js";

export default async function walletAuthenticationRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/register/wallet",
    schema: {
      summary: "Register with wallet",
      body: {
        type: "object",
        required: ["wallet", "username", "signature"],
        properties: {
          wallet: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{40}$",
            description: "Ethereum wallet address",
          },
          username: {
            type: "string",
            description: "Unique username for the user",
          },
          signature: {
            type: "string",
            description: "Signature of the challenge message",
          },
        },
      },
    },
    handler: walletAuthenticationControllers.registerWithWallet,
  });

  fastify.route({
    method: "POST",
    url: "/login/wallet",
    schema: {
      summary: "Login with wallet",
      body: {
        type: "object",
        required: ["wallet", "signature"],
        properties: {
          wallet: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{40}$",
            description: "Ethereum wallet address",
          },
          signature: {
            type: "string",
            description: "Signature of the challenge message",
          },
        },
      },
    },
    handler: walletAuthenticationControllers.loginWithWallet,
  });
}
