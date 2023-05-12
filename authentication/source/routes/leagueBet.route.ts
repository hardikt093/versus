import express from "express";
import leagueBetController from "../leagueproxy/bet.controller";
import auth from "../middlewares/auth";
const router = express.Router();

router.post("/bet", auth, leagueBetController.createBet);
router.get("/bet/:id/result", auth, leagueBetController.getResult);
router.post("/bet/listByStatus", auth, leagueBetController.listByStatus);
router.post("/bet/:id/response", auth, leagueBetController.betResponse);
router.post("/bet/:id/modify", auth, leagueBetController.modifyBet);
router.post("/bet/:id/result", auth, leagueBetController.betResult);
router.post("/bet/:id/result-satisfied", auth, leagueBetController.betResultSatisfied);
export = router;
