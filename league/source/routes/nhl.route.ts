import express from "express";
import nhlController from "../goalserve/NHL/nhl.controller";

const router = express.Router();
router.post("/addMatchData", nhlController.addNhlMatch);
router.post("/addMatchDataFutureForNhl", nhlController.addMatchDataFutureForNhl);
router.get("/standings", nhlController.getNhlStandings);
router.get("/single-game-boxscore-final", nhlController.nhlSingleGameBoxScore);
router.get("/get-team", nhlController.nhlGetTeam);
router.get("/scoreWithDate", nhlController.nhlScoreWithDate)
router.get("/scoreWithCurrentDate", nhlController.nhlScoreWithCurrentDate)
router.get("/single-game-boxscore-upcomming", nhlController.nhlSingleGameBoxScoreUpcomming)
router.get("/single-game-boxscore-live", nhlController.nhlSingleGameBoxScoreLive)

export = router;
