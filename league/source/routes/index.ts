import express from "express";

import goalserveRoute from "./goalserve.route";
import betRoute from "./bet.route";
import matchRoute from "./match.route";
import matchEventRoute from "./matchEvent.route";
import matchOddsRoute from "./matchOdds.route";
import apiDocsRoute from "./api.docs.route";

const router = express.Router();

router.use("/api-docs", apiDocsRoute);
router.use("/mlb", goalserveRoute);
router.use("/bet", betRoute);
router.use("/match", matchRoute);
router.use("/matchEvent", matchEventRoute);
router.use("/matchOdds", matchOddsRoute);

export = router;
