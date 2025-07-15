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

export const readFriendship = {
  params: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

export const deleteFriendship = {
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
