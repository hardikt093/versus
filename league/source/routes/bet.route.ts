import express from "express";

import oneToOneBatController from "../bet/bet.controller";
import validate from "../middlewares/validate";
import oneToOneBatValidation from "../bet/bet.validation";
import auth from "../middlewares/auth";

const router = express.Router();

router.post(
  "/",
  auth,
  validate(oneToOneBatValidation.createOneToOneBat),
  oneToOneBatController.createBet
);

export default router;
