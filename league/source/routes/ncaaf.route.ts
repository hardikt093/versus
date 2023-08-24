import express from "express";
import goalserveController from "../goalserve/NCAAF/ncaaf.controller";

const router = express.Router();
router.post("/addTeam", goalserveController.addTeamNCAAF);

export = router;
