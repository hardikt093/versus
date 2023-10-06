import express, { Express } from "express";
import swaggerUi from "swagger-ui-express";

import swaggerDocument from "../config/swagger";

const router: Express = express();
router.use("/", swaggerUi.serve);
router.get("/", swaggerUi.setup(swaggerDocument));

export default router;
