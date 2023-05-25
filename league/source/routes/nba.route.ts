import express from "express";
import goalserveController from "../goalserve/goalserve.controller";

const router = express.Router();
router.post("/team", goalserveController.createTeamNBA);
router.post("/team-image", goalserveController.createTeamImageNBA);

export = router;
