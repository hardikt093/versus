import express from "express";

import mlbRoute from "./mlb.route";
import nhlRoute from "./nhl.route";
import nbaRoute from "./nba.route";
import betRoute from "./bet.route";
import generalRoute from "./general.route";
import apiDocsRoute from "./api.docs.route";

const router = express.Router();

router.use("/api-docs", apiDocsRoute);
router.use("/league/mlb", mlbRoute);
router.use("/league/nhl", nhlRoute);
router.use("/league/nba", nbaRoute);
router.use("/bet", betRoute);
router.use("/general", generalRoute);

export = router;
