import express from "express";
import goalserveController from "../goalserve/NCAAF/ncaaf.controller";
import multer from "multer";
import ncaafController from "../goalserve/NCAAF/ncaaf.controller";

const router = express.Router();
var upload = multer({ dest: "uploads/" });
router.post(
  "/addTeam",
  upload.single("file"),
  goalserveController.addTeamNCAAF
);
router.get("/standings", goalserveController.getNcaafStandings);
// router.post("/addTeamImage", goalserveController.addTeamNCAAFImage);
router.get("/single-game-boxscore-upcomming", goalserveController.ncaafUpcomming);
router.get("/single-game-boxscore-final", goalserveController.ncaafFinal);
router.get("/single-game-boxscore-live", goalserveController.ncaafLive);

router.get("/getCalendar", ncaafController.getCalendar);
router.post("/scoreWithDate", ncaafController.nflScoreWithDate);


export = router;
