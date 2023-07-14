import express from "express";

import mlbController from "../goalserve/MLB/mlb.controller";
import mlbValidation from "./../goalserve/MLB/mlb.validation";
import validate from "../middlewares/validate";

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
// router.get("/standings", goalserveController.baseballStandings);
router.get("/scoreWithDate", mlbController.mlbScoreWithDate);
router.get("/standings", mlbController.getBseballStandings);

/**
 * @swagger
 * definitions:
 *   getLeague:
 */

/**
 * @swagger
 *
 * /mlb/league:
 *   get:
 *     tags:
 *       - "league"
 *     description: get league
 *     produces:
 *       - application/json
 *     parameters:
 *         description: get league
 *         schema:
 *           $ref: "#/definitions/getLeague"
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: get league
 */

/**
 * @swagger
 * definitions:
 *   createLeague:
 */

/**
 * @swagger
 *
 * /mlb/league:
 *   post:
 *     tags:
 *       - "create league"
 *     description: create league
 *     produces:
 *       - application/json
 *     parameters:
 *         description: create league
 *         schema:
 *           $ref: "#/definitions/createLeague"
 *     security:
 *       - Bearer: []
 *     responses:
 *       200:
 *         description: get league
 */
router.post(
  "/league",
  validate(mlbValidation.createLeague),
  mlbController.createLeague
);
router.post("/player", mlbController.createPlayer);
router.get(
  "/scoreWithCurrentDate",
  mlbController.scoreWithCurrentDate
);
router.get(
  "/upcoming2DaysMatch",
  mlbController.get2DaysUpcomingDataFromMongodb
);
router.get(
  "/upcoming12HoursGame",
  mlbController.get12HoursUpcomingGameData
);
router.post("/addMatchData", mlbController.addMatchData);
router.post("/addMatchDataFuture", mlbController.addMatchDataFuture);
router.get("/addstandings", mlbController.addStanding);
router.post("/addTeamStats", mlbController.statsTeam);
router.get(
  "/single-game-boxscore-final",
  mlbController.singleGameBoxScore
);
router.get(
  "/single-game-boxscore-upcomming",
  mlbController.singleGameBoxScoreUpcomming
);
router.get(
  "/single-game-boxscore-live",
  mlbController.mlbSingleGameBoxScoreLive
);
router.get("/get-team", mlbController.mlbGetTeam);
export default router;
