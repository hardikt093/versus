import express from "express";
import leagueNbaProxyController from "../leagueproxy/leagueNbaProxy.controller";
import auth from "../middlewares/auth";
import validate from "../middlewares/validate";
import leagueValidation from "../leagueproxy/league.validation";
const router = express.Router();

router.get("/scoreWithDate", validate(leagueValidation.scoreWithCurrentDate), leagueNbaProxyController.nbaScoreWithDate);
router.get("/scoreWithCurrentDate", validate(leagueValidation.scoreWithCurrentDate), leagueNbaProxyController.nbaScoreWithCurrentDate);
router.get("/get-team", validate(leagueValidation.nbaGetTeam), leagueNbaProxyController.nbaGetTeam);
router.get("/single-game-boxscore-upcomming", validate(leagueValidation.singleGameBoxscoreUpcomming), leagueNbaProxyController.nbaSingleGameBoxScoreUpcomming);
router.get("/single-game-boxscore-final", auth, validate(leagueValidation.singleGameBoxscore), leagueNbaProxyController.nbaSingleGameBoxScore);
router.get("/standings", leagueNbaProxyController.nbaStandings);

export = router;
