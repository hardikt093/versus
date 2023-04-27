import express from "express";
import chatProxyController from "../chat/chat.controller";
import auth from "../middlewares/auth";

const router = express.Router();

router.get("contact/getContacts", auth, chatProxyController.getContacts);
router.post("contact/createContact", auth, chatProxyController.createContact);
router.get(
  "conversation/getConversation/:id",
  auth,
  chatProxyController.getConversation
);
router.post("/file/fileUpload", auth, chatProxyController.fileUpload);

export = router;
