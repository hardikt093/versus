import express from "express";
import oneToOneChatController from "../oneToOneChat/oneToOneChat.controller";
import oneToOneChatValidation from "../oneToOneChat/oneToOneChat.validation";
import validate from "../middlewares/validate";
const router = express.Router();

router.post(
  "/createChannel",
  validate(oneToOneChatValidation.createOneToOneChannel),
  oneToOneChatController.createChannel
);

export = router;
