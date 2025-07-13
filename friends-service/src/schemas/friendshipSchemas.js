export const createFriendship = {
  params: {
    type: "object",
    properties: {
      friendId: {
        type: "number",
        minimum: 1,
      },
    },
    required: ["friendId"],
  },
};
