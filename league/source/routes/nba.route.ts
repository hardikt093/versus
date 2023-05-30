import express from "express";
import goalserveController from "../goalserve/goalserve.controller";

const router = express.Router();
router.post("/team", goalserveController.createTeamNBA);
router.post("/team-image", goalserveController.createTeamImageNBA);
router.post("/addMatchData", goalserveController.addNbaMatch);
router.post("/addMatchDataFutureForNba", goalserveController.addMatchDataFutureForNba);
router.post("/addPlayer", goalserveController.addNbaPlayer);
router.post("/addNbaInjuredPlayer", goalserveController.addNbaInjuredPlayer);
router.post("/addStandings", goalserveController.addNbaStandings);

export = router;
