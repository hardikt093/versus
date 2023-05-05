import express from "express";

import matchOddsController from "../matchOdds/matchOdds.controller";
import validate from "../middlewares/validate";
import matchOddsValidation from "../matchOdds/matchOdds.validation";
import auth from "../middlewares/auth";

const router = express.Router();

router.post(
  "/listBySportAndMatch",
  validate(matchOddsValidation.matchOddsListBySportsAndMatch),
  matchOddsController.matchOddsListBySportsAndMatch
);
export default router;
