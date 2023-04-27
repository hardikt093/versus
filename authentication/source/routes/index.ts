import express from "express";

import authRoute from "./auth.route";
import userRoute from "./user.route";
import chatRoute from "./chat.route";
import leagueRoute from "./league.route";
import apiDocsRoute from "./api.docs.route";

const router = express.Router();

router.use("/api-docs", apiDocsRoute);
router.use("/auth", authRoute);
router.use("/users", userRoute);
router.use("/", chatRoute);
router.use("/league", leagueRoute);

export = router;
