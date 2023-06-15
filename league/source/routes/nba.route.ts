import express from "express";
import goalserveController from "../goalserve/NBA/nba.controller";

const router = express.Router()
router.post("/addMatchData", goalserveController.addNbaMatch);
router.post("/addMatchDataFutureForNba", goalserveController.addMatchDataFutureForNba);
router.post("/addPlayer", goalserveController.addNbaPlayer);
router.post("/addNbaInjuredPlayer", goalserveController.addNbaInjuredPlayer);
router.post("/addStandings", goalserveController.addNbaStandings);
router.get("/standings", goalserveController.getNbaStandings);
router.get("/scoreWithDate", goalserveController.nbaScoreWithDate)
router.get("/scoreWithCurrentDate", goalserveController.nbaScoreWithCurrentDate);
router.get("/get-team", goalserveController.nbaGetTeam);
router.get("/single-game-boxscore-final", goalserveController.nbaSingleGameBoxScore);
router.get("/single-game-boxscore-upcomming", goalserveController.nbaSingleGameBoxScoreUpcomming);
router.get("/single-game-boxscore-live", goalserveController.nbaSingleGameBoxScoreLive);
export = router;
