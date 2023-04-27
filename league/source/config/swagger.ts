import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  info: {
    title: "VERSUS",
    version: "1.0.0",
    description: "VERSUS API Collection",
  },
  host: `${process.env.API_HOST}:${process.env.PORT || 8001}`,
  schemes: ["http", "https"],
  basePath: "/",
};

const options = {
  swaggerDefinition,
  apis: [
    "./source/routes/auth.route.ts",
    "./source/routes/user.route.ts",
    "./source/routes/contact.route.ts",
    "./source/routes/conversation.route.ts",
    "./source/routes/upload.route.ts",
    "./source/routes/goalserve.route.ts",
    "./source/utils/swagger.yml",
  ],
};

export default swaggerJSDoc(options);
