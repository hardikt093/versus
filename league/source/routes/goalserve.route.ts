import express from "express";

import goalserveController from "../goalserve/goalserve.controller";
import goalserveValidation from "./../goalserve/goalserve.validation";
import auth from "../middlewares/auth";
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
router.get("/scoreWithDate", auth, goalserveController.mlbScoreWithDate);
router.get("/standings", auth, goalserveController.getBseballStandings);

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
router.get("/league", auth, goalserveController.getAllLeague);
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
  auth,
  validate(goalserveValidation.updateLeague),
  goalserveController.updateLeague
);
router.delete(
  "/league/:id",
  auth,
  validate(goalserveValidation.deleteApi),
  goalserveController.deleteLeague
);

router.get("/player", auth, goalserveController.getAllPlayer);
router.post("/player", auth, goalserveController.createPlayer);
router.put(
  "/player/:id",
  auth,
  validate(goalserveValidation.updatePlayer),
  goalserveController.updatePlayer
);
router.delete(
  "/player/:id",
  auth,
  validate(goalserveValidation.deleteApi),
  goalserveController.deletePlayer
);

router.get("/team", auth, goalserveController.getAllTeam);

router.post(
  "/team",
  auth,
  // validate(goalserveValidation.createTeam),
  goalserveController.createTeam
);

router.put(
  "/team/:id",
  auth,
  validate(goalserveValidation.updateTeam),
  goalserveController.updateTeam
);

router.delete(
  "/team/:id",
  validate(goalserveValidation.deleteApi),
  auth,
  goalserveController.deleteTeam
);

router.get("/division", auth, goalserveController.getAllDivison);

router.post(
  "/division",
  auth,
  validate(goalserveValidation.createTeam),
  goalserveController.createDivison
);

router.put(
  "/division/:id",
  auth,
  validate(goalserveValidation.updateTeam),
  goalserveController.updateDivison
);

router.delete(
  "/division/:id",
  validate(goalserveValidation.deleteApi),
  auth,
  goalserveController.deleteDivision
);
router.get(
  "/scoreWithCurrentDate",
  auth,
  goalserveController.scoreWithCurrentDate
);
router.post("/addMatchData", goalserveController.addMatchData);
router.post("/addMatchDataFuture", goalserveController.addMatchDataFuture);
router.get("/addstandings", goalserveController.addStanding);
router.get("/addAbbrevation", goalserveController.addAbbrevation);
router.get(
  "/single-game-boxscore",
  auth,
  goalserveController.singleGameBoxScore
);
export default router;
