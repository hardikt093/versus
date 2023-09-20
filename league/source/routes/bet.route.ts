import express from "express";

import BetController from "../bet/bet.controller";
import validate from "../middlewares/validate";
import BetValidation from "../bet/bet.validation";
import auth from "../middlewares/auth";

const router = express.Router();

router.post(
  "/",
  auth,
  validate(BetValidation.createBet),
  BetController.createBet
);
router.get(
  "/getBetUser/:userId",
  BetController.getBetUser
);
router.post(
  "/listByStatus",
  auth,
  validate(BetValidation.listBetsByStatus),
  BetController.listBetsByStatus
);

router.post(
  "/list",
  auth,
  validate(BetValidation.listbyType),
  BetController.listBetsByType
);
router.post(
  "/home-list",
  auth,
  validate(BetValidation.listbyType),
  BetController.listBetsDashboard
);

router.post(
  "/squared",
  auth,
  validate(BetValidation.betSettled),
  BetController.betSettledUpdate
);
router.post(
  "/like",
  auth,
  validate(BetValidation.betLike),
  BetController.likeBet
);
router.post(
  "/:id/response",
  auth,
  validate(BetValidation.responseBet),
  BetController.responseBet
);

router.delete(
  "/:id",
  auth,
  validate(BetValidation.deleteBet),
  BetController.deleteBet
);

router.post(
  "/:id/modify",
  auth,
  validate(BetValidation.modifyBet),
  BetController.updateBetRequest
);

router.post(
  "/:id/result",
  auth,
  validate(BetValidation.resultBet),
  BetController.resultBet
);

router.get("/:id/result", auth, BetController.getResultBet);
router.post("/getUserBetDetails", auth, BetController.getUserBetDetails);
router.post("/getWonBets", auth, BetController.getBetsFromContacts);

router.post(
  "/:id/result-satisfied",
  auth,
  validate(BetValidation.responseToBatResultSatisfiedOrNot),
  BetController.resultBetVerified
);
export default router;
