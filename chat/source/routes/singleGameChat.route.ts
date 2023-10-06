import express from "express";

import auth from "../middlewares/auth";
import channelController from "../singleGameChat/singleGameChat.controller";
import validate from "../middlewares/validate";
import channelValidation from "../singleGameChat/singleGameChat.controller";

const router = express.Router();

router.post(
  "/getMatchChannel",
  auth,
  validate(channelValidation.getMatchPublicChannelConversation),
  channelController.getMatchPublicChannelConversation
);

router.post(
  "/addFinalMatchChannel",
  channelController.addFinalMatchChannel
);

router.get("/getChannelForDashboard",channelController.getChannelForDashboard)
router.get("/getConversation/:id",channelController.getConversation)


export = router;
