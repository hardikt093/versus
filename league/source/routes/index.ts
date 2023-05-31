import express from "express";

import mlbRoute from "./mlb.route";
import nhlRoute from "./nhl.route";

import betRoute from "./bet.route";
import apiDocsRoute from "./api.docs.route";

const router = express.Router();

router.use("/api-docs", apiDocsRoute);
router.use("/mlb", mlbRoute);
router.use("/nhl", nhlRoute);
router.use("/bet", betRoute);

export = router;
