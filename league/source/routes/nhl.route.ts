import express from "express";
import goalserveController from "../goalserve/goalserve.controller";

const router = express.Router();
router.post("/team", goalserveController.createTeamNHL);
router.post("/team-image", goalserveController.createTeamImageNHL);
router.post("/addMatchData", goalserveController.addNhlMatch);
router.post("/addPlayer", goalserveController.addNhlPlayer);

export = router;
