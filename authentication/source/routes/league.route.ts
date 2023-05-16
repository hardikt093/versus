import express from "express";
import leagueBetRoute from "./leagueBet.route";
import leagueProxyController from "../leagueproxy/leagueProxy.controller";
import auth from "../middlewares/auth";
import validate from "../middlewares/validate";
import leagueValidation from "../leagueproxy/league.validation";
const router = express.Router();

router.use("/", leagueBetRoute);
router.get("/mlb/standings", auth, leagueProxyController.standings);
router.get("/mlb/scoreWithDate", auth, validate(leagueValidation.scoreWithDate), leagueProxyController.mlbScoreWithDate);
router.get("/mlb/single-game-boxscore", auth, validate(leagueValidation.singleGameBoxscore), leagueProxyController.singleGameBoxscore);
router.get("/mlb/single-game-boxscore-upcomming", auth, validate(leagueValidation.singleGameBoxscore), leagueProxyController.singleGameBoxscoreUpcomming);
router.get("/mlb/scoreWithCurrentDate", auth, leagueProxyController.scoreWithCurrentDate);

export = router;
