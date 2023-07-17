import express from "express";

import auth from "../middlewares/auth";
import channelController from "../channel/channel.controller";
import validate from "../middlewares/validate";
import channelValidation from "../channel/channel.validation";

const router = express.Router();

router.post(
  "/getMatchChannel",
  auth,
  validate(channelValidation.getMatchPublicChannelConversation),
  channelController.getMatchPublicChannelConversation
);

export = router;