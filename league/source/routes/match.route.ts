import express from "express";

import matchController from "../match/match.controller";
import validate from "../middlewares/validate";
import matchValidation from "../match/match.validation";

const router = express.Router();

router.post(
  "/listByEventAndSport",
  validate(matchValidation.matchListBySportsAndEvent),
  matchController.matchListBySportsAndEvent
);
export default router;
