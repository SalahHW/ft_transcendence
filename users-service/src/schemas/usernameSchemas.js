export const updateUsername = {
  body: {
    type: "object",
    required: ["username"],
    properties: {
      username: { type: "string" },
    },
    additionalProperties: false,
  },
};
