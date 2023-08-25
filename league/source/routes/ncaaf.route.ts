import express from "express";
import goalserveController from "../goalserve/NCAAF/ncaaf.controller";
import multer from "multer";
import ncaafController from "../goalserve/NCAAF/ncaaf.controller";

const router = express.Router();
var upload = multer({ dest: 'uploads/' });
router.post("/addTeam", upload.single('file'), goalserveController.addTeamNCAAF);

router.get("/getCalendar", ncaafController.getCalendar);


export = router;
