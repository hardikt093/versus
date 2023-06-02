import express from "express";
import goalserveController from "../goalserve/NBA/goalserve.controller";

const router = express.Router();
router.post("/team", goalserveController.createTeamNBA);
router.post("/team-image", goalserveController.createTeamImageNBA);
router.post("/addMatchData", goalserveController.addNbaMatch);
router.post("/addMatchDataFutureForNba", goalserveController.addMatchDataFutureForNba);
router.post("/addPlayer", goalserveController.addNbaPlayer);
router.post("/addNbaInjuredPlayer", goalserveController.addNbaInjuredPlayer);
router.post("/addStandings", goalserveController.addNbaStandings);
router.get("/get-standings", goalserveController.getNbaStandings);
router.get("/scoreWithDate", goalserveController.nbaScoreWithDate)
router.get("/scoreWithCurrentDate", goalserveController.nbaScoreWithCurrentDate);
router.get("/get-team", goalserveController.nbaGetTeam);
router.get("/single-game-boxscore-final", goalserveController.nbaSingleGameBoxScore);
export = router;
