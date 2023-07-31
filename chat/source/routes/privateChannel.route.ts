import express from "express";

import auth from "../middlewares/auth";
import validate from "../middlewares/validate";
import privateChannelvalidation from "../privateChannel/privateChannel.validation";
import privateChannelController from "../privateChannel/privateChannel.controller";

const router = express.Router();

router.post(
  "/createPrivateChannel",
  auth,
  validate(privateChannelvalidation.createPrivateChannel),
  privateChannelController.createPrivateChannnel
);
router.post(
  "/addUserToPrivateChannel",
  auth,
  validate(privateChannelvalidation.addUserToPrivateChannel),
  privateChannelController.addUserToPrivateChannel
);
router.get("/privateChannels", auth, privateChannelController.getUsersChannel);
router.delete(
  "/removeUserFromPrivateChannel",
  auth,
  privateChannelController.removeUserFromChannel
);
router.put(
  "/updateChannelDetails/:id",
  auth,
  validate(privateChannelvalidation.updatePrivateChannel),
  privateChannelController.updateChannelDetails
);
router.delete(
  "/removeUserFromPrivateChannel",
  auth,
  privateChannelController.removeUserFromChannel
);
router.put(
  "/updateChannelDetails",
  auth,
  validate(privateChannelvalidation.updatePrivateChannel),
  privateChannelController.updateChannelDetails
);
router.get(
  "/getConversation/:channelId",
  auth,
  privateChannelController.getConversation
);
router.get(
  "/getChannelDetails",
  auth,
  privateChannelController.getChannelDetails
);
router.post(
  "/updateHeader",
  validate(privateChannelvalidation.updateHeader),
  privateChannelController.updateHearder
);

export = router;
