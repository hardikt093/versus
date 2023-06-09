import express from "express";
import leagueBetRoute from "./leagueBet.route";
import leagueNbaRoute from "./nbaLeague.route";
import leagueProxyController from "../leagueproxy/leagueProxy.controller";
import validate from "../middlewares/validate";
import leagueValidation from "../leagueproxy/league.validation";
const router = express.Router();

router.use("/bet", leagueBetRoute);
router.use("/nba", leagueNbaRoute);
router.get("/mlb/standings", leagueProxyController.standings);
router.get("/mlb/scoreWithDate", validate(leagueValidation.scoreWithDate), leagueProxyController.mlbScoreWithDate);
router.get("/mlb/single-game-boxscore-final", validate(leagueValidation.singleGameBoxscore), leagueProxyController.singleGameBoxscore);
router.get("/mlb/single-game-boxscore-upcomming", validate(leagueValidation.singleGameBoxscore), leagueProxyController.singleGameBoxscoreUpcomming);
router.get("/mlb/scoreWithCurrentDate", validate(leagueValidation.scoreWithCurrentDate), leagueProxyController.scoreWithCurrentDate);

router.get("/nhl/standings", leagueProxyController.nhlStandings);
router.get("/nhl/single-game-boxscore-final", leagueProxyController.nhlSingleGameBoxScore);
router.get("/nhl/single-game-boxscore-upcomming", leagueProxyController.nhlSingleGameBoxScoreUpcomming);
router.get("/nhl/single-game-boxscore-live", leagueProxyController.nhlSingleGameBoxScoreLive);
router.get("/nhl/scoreWithDate", leagueProxyController.nhlScoreWithDate);
router.get("/nhl/get-team", leagueProxyController.nhlGetTeam);
router.get("/nhl/scoreWithCurrentDate", leagueProxyController.nhlScoreWithCurrentDate);


export = router;
