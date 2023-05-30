import express from "express";
import leagueBetRoute from "./leagueBet.route";
import leagueProxyController from "../leagueproxy/leagueProxy.controller";
import auth from "../middlewares/auth";
import validate from "../middlewares/validate";
import leagueValidation from "../leagueproxy/league.validation";
const router = express.Router();

router.use("/bet", leagueBetRoute);
router.get("/mlb/standings", auth, leagueProxyController.standings);
router.get("/mlb/scoreWithDate", auth, validate(leagueValidation.scoreWithDate), leagueProxyController.mlbScoreWithDate);
router.get("/mlb/single-game-boxscore-final", auth, validate(leagueValidation.singleGameBoxscore), leagueProxyController.singleGameBoxscore);
router.get("/mlb/single-game-boxscore-upcomming", auth, validate(leagueValidation.singleGameBoxscore), leagueProxyController.singleGameBoxscoreUpcomming);
router.get("/mlb/scoreWithCurrentDate", auth, validate(leagueValidation.scoreWithCurrentDate), leagueProxyController.scoreWithCurrentDate);

router.get("/nhl/standings", leagueProxyController.nhlStandings);
router.get("/nhl/single-game-boxscore-final", leagueProxyController.nhlSingleGameBoxScore);
router.get("/nhl/single-game-boxscore-upcomming", leagueProxyController.nhlSingleGameBoxScoreUpcomming);
router.get("/nhl/single-game-boxscore-live", leagueProxyController.nhlSingleGameBoxScoreLive);
router.get("/nhl/scoreWithDate", leagueProxyController.nhlScoreWithDate);
router.get("/nhl/get-team", leagueProxyController.nhlGetTeam);
router.get("/nhl/scoreWithCurrentDate", leagueProxyController.nhlScoreWithCurrentDate);


export = router;
