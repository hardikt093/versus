import express from "express";
import leagueProxyController from "../leagueproxy/leagueProxy.controller";
import auth from "../middlewares/auth";
const router = express.Router();

router.get("/mlb/standings", auth, leagueProxyController.standings);
router.post("/bet", auth, leagueProxyController.createBet);
router.post("/bet/listByStatus", auth, leagueProxyController.listByStatus);
router.post("/bet/:id/response", auth, leagueProxyController.betResponse);
router.post("/bet/:id/result", auth, leagueProxyController.betResult);
router.post("/bet/:id/result-satisfied", auth, leagueProxyController.betResultSatisfied);
router.post("/bet/:id/complete", auth, leagueProxyController.betComplete);
export = router;
