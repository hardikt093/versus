import express from "express";
import leagueBetController from "../leagueproxy/bet.controller";
import auth from "../middlewares/auth";
const router = express.Router();

router.post("/", auth, leagueBetController.createBet);
router.get("/:id/result", auth, leagueBetController.getResult);
router.post("/listByStatus", auth, leagueBetController.listByStatus);
router.post("/:id/response", auth, leagueBetController.betResponse);
router.post("/:id/modify", auth, leagueBetController.modifyBet);
router.post("/:id/result", auth, leagueBetController.betResult);
router.post("/:id/result-satisfied", auth, leagueBetController.betResultSatisfied);
export = router;
