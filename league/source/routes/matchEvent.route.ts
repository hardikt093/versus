import express from "express";

import matchEventController from "../matchEvent/matchEvent.controller";
import validate from "../middlewares/validate";
import matchEventValidation from "../matchEvent/matchEvent.validation";

const router = express.Router();

router.post(
  "/listBySport",
  validate(matchEventValidation.matchListBySports),
  matchEventController.eventListBySports
);
export default router;
