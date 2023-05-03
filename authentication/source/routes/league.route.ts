import express from "express";
import leagueProxyController from "../leagueproxy/leagueProxy.controller";
import auth from "../middlewares/auth";
import validate from "../middlewares/validate";
import leagueValidation from "../leagueproxy/league.validation";
const router = express.Router();

router.get("/mlb/standings", auth, leagueProxyController.standings);
router.get("/mlb/scoreWithDate", auth, validate(leagueValidation.scoreWithDate), leagueProxyController.mlbScoreWithDate);
export = router;
