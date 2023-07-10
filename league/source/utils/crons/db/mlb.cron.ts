import cron from "node-cron";

import MlbService from "../../../goalserve/MLB/db.cron.service";
const mlbService = new MlbService();

let iscreateOddsRunning: boolean = false;
const createOdds = cron.schedule("*/5 * * * * *", async () => {
  if (iscreateOddsRunning) {
    // console.log("createOdds Skip");
    return;
  }
  iscreateOddsRunning = true;
  try {
    // console.info("inside score cron createOdds");
    await mlbService.createOdds();
  } catch (error) {
    console.log(error);
  } finally {
    iscreateOddsRunning = false;
  }
});

let isupdateCurruntDateRecordRunning: boolean = false;
const updateCurruntDateRecord = cron.schedule("*/5 * * * * *", async () => {
  if (isupdateCurruntDateRecordRunning) {
    // console.log("updateCurruntDateRecord Skip");
    return;
  }
  isupdateCurruntDateRecordRunning = true;
  try {
    // console.info("inside score cron updateCurruntDateRecord");
    await mlbService.updateCurruntDateRecord();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateCurruntDateRecordRunning = false;
  }
});

let isupdateInjuryRecoredRunning: boolean = false;
const updateInjuryRecored = cron.schedule("*/10 * * * * *", async () => {
  if (isupdateInjuryRecoredRunning) {
    // console.log("updateInjuryRecored Skip");
    return;
  }
  isupdateInjuryRecoredRunning = true;
  try {
    // console.info("inside score cron updateInjuryRecored");
    await mlbService.updateInjuryRecored();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateInjuryRecoredRunning = false;
  }
});

let isupdateStandingRecordRunning: boolean = false;
const updateStandingRecord = cron.schedule("*/10 * * * * *", async () => {
  if (isupdateStandingRecordRunning) {
    // console.log("updateStandingRecord Skip");
    return;
  }
  isupdateStandingRecordRunning = true;
  try {
    // console.info("inside score cron updateStandingRecord");
    await mlbService.updateStandingRecord();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateStandingRecordRunning = false;
  }
});

let isupdateTeamStatsRunning: boolean = false;
const updateTeamStats = cron.schedule("*/10 * * * * *", async () => {
  if (isupdateTeamStatsRunning) {
    // console.log("updateTeamStats Skip");
    return;
  }
  isupdateTeamStatsRunning = true;
  try {
    // console.info("inside score cron updateTeamStats");
    await mlbService.updateTeamStats();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateTeamStatsRunning = false;
  }
});

let isupdatePlayerStatsRunning: boolean = false;
const updatePlayerStats = cron.schedule("*/10 * * * * *", async () => {
  if (isupdatePlayerStatsRunning) {
    // console.log("updatePlayerStats Skip");
    return;
  }
  isupdatePlayerStatsRunning = true;
  try {
    // console.info("inside score cron updatePlayerStats");
    await mlbService.updatePlayerStats();
  } catch (error) {
    console.log(error);
  } finally {
    isupdatePlayerStatsRunning = false;
  }
});

let iscreateOrUpdateOddsRunning: boolean = false;
const createOrUpdateOdds = cron.schedule("*/5 * * * * *", async () => {
  if (iscreateOrUpdateOddsRunning) {
    // console.log("createOrUpdateOdds Skip");
    return;
  }
  iscreateOrUpdateOddsRunning = true;
  try {
    // console.info("inside score cron createOrUpdateOdds");
    await mlbService.createOrUpdateOdds();
  } catch (error) {
    console.log(error);
  } finally {
    iscreateOrUpdateOddsRunning = false;
  }
});


let isupdateMlbMatchRunning: boolean = false;
const updateMlbMatch = cron.schedule("*/5 * * * * *", async () => {
  if (isupdateMlbMatchRunning) {
    return;
  }
  isupdateMlbMatchRunning = true;
  try {;
    await mlbService.updateMlbMatch();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateMlbMatchRunning = false;
  }
});
export default {
  createOdds,
  updateCurruntDateRecord,
  updateStandingRecord,
  createOrUpdateOdds,
  updatePlayerStats,
  updateInjuryRecored,
  updateMlbMatch,
  updateTeamStats,
};
