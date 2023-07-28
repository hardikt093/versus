import express from "express";
import oneToOneChatController from "../oneToOneChat/oneToOneChat.controller";

const router = express.Router();

router.post("/createChanel",oneToOneChatController.createChannel)

export = router