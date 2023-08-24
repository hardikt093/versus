import express from "express";
import goalserveController from "../goalserve/NCAAF/ncaaf.controller";
import multer from "multer";

const router = express.Router();
var upload = multer({ dest: 'uploads/' });
router.post("/addTeam", upload.single('file'), goalserveController.addTeamNCAAF);

export = router;
