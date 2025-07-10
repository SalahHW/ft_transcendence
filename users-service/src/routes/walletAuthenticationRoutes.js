import * as walletAuthenticationControllers from "../controllers/walletAuthenticationControllers.js";

export default async function walletAuthenticationRoutes(fastify) {
  fastify.route({
    method: "POST",
    url: "/register/wallet",
    schema: {
      summary: "Register with wallet",
      body: {
        type: "object",
        required: ["wallet", "username", "signature", "timestamp"],
        properties: {
          wallet: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{40}$",
          },
          username: {
            type: "string",
          },
          signature: {
            type: "string",
          },
          timestamp: {
            type: "string",
            description: "ISO timestamp of the challenge",
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
          },
          signature: {
            type: "string",
          },
        },
      },
    },
    handler: walletAuthenticationControllers.loginWithWallet,
  });

  fastify.route({
    method: "GET",
    url: "/wallet/challenge",
    schema: {
      summary: "Get challenge message for wallet",
      querystring: {
        type: "object",
        required: ["wallet"],
        properties: {
          wallet: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{40}$",
          },
        },
      },
    },
    handler: async (req, reply) => {
      const { wallet } = req.query;
      const timestamp = new Date().toISOString();
      const challenge = `Sign this message to login to elsalmatjori.com:\n${timestamp}`;
      return { challenge, timestamp };
    },
  });

  fastify.route({
    method: "POST",
    url: "/wallet/verify",
    schema: {
      summary: "Verify wallet signature",
      body: {
        type: "object",
        required: ["wallet", "signature", "timestamp"],
        properties: {
          wallet: {
            type: "string",
            pattern: "^0x[a-fA-F0-9]{40}$",
          },
          signature: {
            type: "string",
          },
          timestamp: {
            type: "string",
          },
        },
      },
    },
    handler: walletAuthenticationControllers.verifyWalletSignature,
  });
}
