import express from "express";
import goalserveController from "../goalserve/goalserve.controller";

const router = express.Router();
router.post("/team", goalserveController.createTeamNHL);
router.post("/team-image", goalserveController.createTeamImageNHL);
router.post("/addMatchData", goalserveController.addNhlMatch);
router.post("/addMatchDataFutureForNhl", goalserveController.addMatchDataFutureForNhl);
router.post("/addPlayer", goalserveController.addNhlPlayer);
router.post("/addNhlInjuredPlayer", goalserveController.addNhlInjuredPlayer);
router.post("/addStandings", goalserveController.addNhlStandings);
router.get("/get-standings", goalserveController.getNhlStandings);
router.get("/single-game-boxscore-final", goalserveController.nhlSingleGameBoxScore);
router.get("/get-team", goalserveController.nhlGetTeam);
router.get("/scoreWithDate", goalserveController.nhlScoreWithDate)
router.get("/scoreWithCurrentDate", goalserveController.nhlScoreWithCurrentDate)
router.get("/single-game-boxscore-upcomming", goalserveController.nhlSingleGameBoxScoreUpcomming)

export = router;
