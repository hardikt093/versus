import express from "express";
import leagueProxyController from "../leagueproxy/leagueProxy.controller";
import leagueBetRoute from "./leagueBet.route";
import auth from "../middlewares/auth";
const router = express.Router();

router.get("/mlb/standings", auth, leagueProxyController.standings);
router.use("/", leagueBetRoute);
export = router;
