import express from "express";

import goalserveRoute from "./goalserve.route";
import apiDocsRoute from "./api.docs.route";

const router = express.Router();

router.use("/api-docs", apiDocsRoute);
router.use("/mlb", goalserveRoute);

export = router;
