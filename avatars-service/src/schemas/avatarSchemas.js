export const uploadAvatar = {
  params: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

export const getAvatar = {
  params: {
    type: "object",
    properties: {
      userId: {
        type: "number",
        minimum: 1,
      },
    },
    required: ["id"],
  },
};

export const updateAvatar = {
  params: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};

export const deleteAvatar = {
  params: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
};