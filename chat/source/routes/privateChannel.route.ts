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
router.get(
    "/privateChannels",
    auth,
    privateChannelController.getUsersChannel
  );
  router.delete(
    "/removeUserFromPrivateChannel",
    auth,
    privateChannelController.removeUserFromChannel
  );
  router.put(
    "/updateChannelDetails",
    auth,
    privateChannelController.updateChannelDetails
  );
export = router;
