import express from "express";
import nflController from "../goalserve/NFL/nfl.controller";

const router = express.Router();
router.post("/addStanding", nflController.addStanding);
router.get("/getStandings", nflController.getNflStandings);
router.get("/getCalendar", nflController.getCalendar);
router.get("/scoreWithDate", nflController.nflScoreWithDate);

export = router;
