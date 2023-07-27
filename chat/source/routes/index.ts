import express from "express";

import contactRoute from "./contact.route";
import fileUploadRoute from "./upload.route";
import privatechannelroute from "./privateChannel.route";
import channelRoute from "./singleGameChat.route";
import apiDocsRoute from "./api.docs.route";

const router = express.Router();

router.use("/api-docs", apiDocsRoute);
router.use("/contact", contactRoute);
router.use("/file", fileUploadRoute);
router.use("/privateChannel", privatechannelroute);
router.use("/singleGameChat", channelRoute);

export = router;
