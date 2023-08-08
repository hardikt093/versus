import express from "express";
import nflController from "../goalserve/NFL/nfl.controller";

const router = express.Router()

router.post("/addTeams",nflController.addTeam)
router.post("/addStanding",nflController.addStanding)

export = router