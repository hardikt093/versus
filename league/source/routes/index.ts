import express from "express";

import goalserveRoute from "./goalserve.route";
import betRoute from "./bet.route";
import apiDocsRoute from "./api.docs.route";

const router = express.Router();

router.use("/api-docs", apiDocsRoute);
router.use("/mlb", goalserveRoute);
router.use("/bet", betRoute);

export = router;
