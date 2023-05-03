import express from "express";
import leagueProxyController from "../leagueproxy/leagueProxy.controller";
import auth from "../middlewares/auth";
const router = express.Router();

router.get("/mlb/standings", auth, leagueProxyController.standings);
router.get("/mlb/scoreWithDate", auth, leagueProxyController.mlbScoreWithDate);
export = router;
