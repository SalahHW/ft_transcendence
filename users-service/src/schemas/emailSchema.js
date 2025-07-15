export const updateEmail = {
  body: {
    type: "object",
    required: ["email"],
    properties: {
      email: { type: "string", format: "email" },
    },
    additionalProperties: false,
  },
};
