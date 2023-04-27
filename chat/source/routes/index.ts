import express from "express";

import contactRoute from "./contact.route";
import fileUploadRoute from "./upload.route";
import conversationRoute from "./conversation.route";
import apiDocsRoute from "./api.docs.route";

const router = express.Router();

router.use("/api-docs", apiDocsRoute);
router.use("/contact", contactRoute);
router.use("/file", fileUploadRoute);
router.use("/conversation", conversationRoute);

export = router;
