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
router.get("/league", mlbController.getAllLeague);
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
  // auth,
  mlbController.createLeague
);
router.put(
  "/league/:id",

  validate(mlbValidation.updateLeague),
  mlbController.updateLeague
);
router.delete(
  "/league/:id",

  validate(mlbValidation.deleteApi),
  mlbController.deleteLeague
);

router.get("/player", mlbController.getAllPlayer);
router.post("/player", mlbController.createPlayer);
router.put(
  "/player/:id",

  validate(mlbValidation.updatePlayer),
  mlbController.updatePlayer
);
router.delete(
  "/player/:id",

  validate(mlbValidation.deleteApi),
  mlbController.deletePlayer
);

router.get("/team", mlbController.getAllTeam);

router.post(
  "/team",

  // validate(goalserveValidation.createTeam),
  mlbController.createTeam
);

router.put(
  "/team/:id",

  validate(mlbValidation.updateTeam),
  mlbController.updateTeam
);

router.delete(
  "/team/:id",
  validate(mlbValidation.deleteApi),

  mlbController.deleteTeam
);

router.get("/division", mlbController.getAllDivison);

router.post(
  "/division",

  validate(mlbValidation.createTeam),
  mlbController.createDivison
);

router.put(
  "/division/:id",

  validate(mlbValidation.updateTeam),
  mlbController.updateDivison
);

router.delete(
  "/division/:id",
  validate(mlbValidation.deleteApi),

  mlbController.deleteDivision
);
router.get(
  "/scoreWithCurrentDate",

  mlbController.scoreWithCurrentDate
);
router.post("/addMatchData", mlbController.addMatchData);
router.post("/addInjuredPlayers", mlbController.addInjuredPlayers);
router.post("/addMatchDataFuture", mlbController.addMatchDataFuture);
router.get("/addstandings", mlbController.addStanding);
router.post("/addPlayerStats", mlbController.statsPlayerPitching);
router.post("/addTeamStats", mlbController.statsTeam);
router.get(
  "/single-game-boxscore-final",

  mlbController.singleGameBoxScore
);
router.get(
  "/single-game-boxscore-upcomming",

  mlbController.singleGameBoxScoreUpcomming
);
export default router;
