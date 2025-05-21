import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export const swaggerConfig = {
  openapi: {
    info: {
      title: "Users Service API",
      description: "API documentation for the Users Service",
      version: "1.0.0",
    },
  },
};

export const swaggerUiConfig = {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
  staticCSP: true,
  transformSpecification: (swaggerObject, request, reply) => swaggerObject,
  transformSpecificationClone: true,
};

export { swagger, swaggerUi };
