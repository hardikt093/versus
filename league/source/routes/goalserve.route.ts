import express from "express";

import goalserveController from "../goalserve/goalserve.controller";
import auth from "../middlewares/auth";

const router = express.Router();

/**
 * @swagger
 *
 * /mlb/standings:
 *   get:
 *     tags:
 *       - "standings"
 *     description: get standings
 *     produces:
 *       - application/json
 *     parameters:
 *         description: get standings
 *         schema:
 *           $ref: "#/mlb/standings"
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: get standings
 */
router.get("/standings", auth, goalserveController.baseballStandings);
router.get("/scoreWithDate", auth, goalserveController.mlbScoreWithDate);
export default router;
