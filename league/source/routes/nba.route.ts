import express from "express";
import goalserveController from "../goalserve/goalserve.controller";

const router = express.Router();
router.post("/team", goalserveController.createTeamNBA);
router.post("/team-image", goalserveController.createTeamImageNBA);
router.post("/addMatchData", goalserveController.addNbaMatch);
router.post("/addMatchDataFutureForNba", goalserveController.addMatchDataFutureForNba);
export = router;
