import express from "express";
import nflController from "../goalserve/NFL/nfl.controller";

const router = express.Router();
router.post("/addStanding", nflController.addStanding);
router.get("/getStandings", nflController.getNflStandings);
router.get("/getCalendar", nflController.getCalendar);
router.post("/scoreWithDate", nflController.nflScoreWithDate);
router.get("/single-game-boxscore-upcomming", nflController.nflUpcomming)
router.get("/single-game-boxscore-final", nflController.nflFinal)
router.get("/single-game-boxscore-live", nflController.nflLive)

export = router;
