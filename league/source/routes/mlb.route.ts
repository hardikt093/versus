import express from "express";

import goalserveController from "../goalserve/goalserve.controller";
import goalserveValidation from "./../goalserve/goalserve.validation";
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
router.get("/scoreWithDate", goalserveController.mlbScoreWithDate);
router.get("/standings", goalserveController.getBseballStandings);

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
router.get("/league", goalserveController.getAllLeague);
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
  validate(goalserveValidation.createLeague),
  // auth,
  goalserveController.createLeague
);
router.put(
  "/league/:id",

  validate(goalserveValidation.updateLeague),
  goalserveController.updateLeague
);
router.delete(
  "/league/:id",

  validate(goalserveValidation.deleteApi),
  goalserveController.deleteLeague
);

router.get("/player", goalserveController.getAllPlayer);
router.post("/player", goalserveController.createPlayer);
router.put(
  "/player/:id",

  validate(goalserveValidation.updatePlayer),
  goalserveController.updatePlayer
);
router.delete(
  "/player/:id",

  validate(goalserveValidation.deleteApi),
  goalserveController.deletePlayer
);

router.get("/team", goalserveController.getAllTeam);

router.post(
  "/team",

  // validate(goalserveValidation.createTeam),
  goalserveController.createTeam
);

router.put(
  "/team/:id",

  validate(goalserveValidation.updateTeam),
  goalserveController.updateTeam
);

router.delete(
  "/team/:id",
  validate(goalserveValidation.deleteApi),

  goalserveController.deleteTeam
);

router.get("/division", goalserveController.getAllDivison);

router.post(
  "/division",

  validate(goalserveValidation.createTeam),
  goalserveController.createDivison
);

router.put(
  "/division/:id",

  validate(goalserveValidation.updateTeam),
  goalserveController.updateDivison
);

router.delete(
  "/division/:id",
  validate(goalserveValidation.deleteApi),

  goalserveController.deleteDivision
);
router.get(
  "/scoreWithCurrentDate",

  goalserveController.scoreWithCurrentDate
);
router.post("/addMatchData", goalserveController.addMatchData);
router.post("/addInjuredPlayers", goalserveController.addInjuredPlayers);
router.post("/addMatchDataFuture", goalserveController.addMatchDataFuture);
router.get("/addstandings", goalserveController.addStanding);
router.post("/addPlayerStats", goalserveController.statsPlayerPitching);
router.post("/addTeamStats", goalserveController.statsTeam);
router.get(
  "/single-game-boxscore-final",

  goalserveController.singleGameBoxScore
);
router.get(
  "/single-game-boxscore-upcomming",

  goalserveController.singleGameBoxScoreUpcomming
);
export default router;
