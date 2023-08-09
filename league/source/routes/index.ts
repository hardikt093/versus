import express from "express";

import mlbRoute from "./mlb.route";
import nhlRoute from "./nhl.route";
import nbaRoute from "./nba.route";
import nflRoter from "./nfl.route";

import betRoute from "./bet.route";
import apiDocsRoute from "./api.docs.route";

const router = express.Router();

router.use("/api-docs", apiDocsRoute);
router.use("/league/mlb", mlbRoute);
router.use("/league/nhl", nhlRoute);
router.use("/league/nba", nbaRoute);
router.use("/league/nfl", nflRoter);
router.use("/bet", betRoute);

export = router;
