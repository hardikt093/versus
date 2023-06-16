import cron from "node-cron";

import MlbService from "../../../goalserve/MLB/db.cron.service";
const mlbService = new MlbService();

let iscreateAndUpdateOddsRunning: boolean = false;
const createAndUpdateOdds = cron.schedule("*/50 * * * * *", async () => {
  if (iscreateAndUpdateOddsRunning) {
    console.log("createAndUpdateOdds Skip");
    return;
  }
  iscreateAndUpdateOddsRunning = true;
  try {
    console.info("inside score cron createAndUpdateOdds");
    await mlbService.createAndUpdateOdds();
  } catch (error) {
    console.log(error);
  } finally {
    iscreateAndUpdateOddsRunning = false;
  }
});

let isupdateCurruntDateRecordRunning: boolean = false;
const updateCurruntDateRecord = cron.schedule("*/5 * * * * *", async () => {
  if (isupdateCurruntDateRecordRunning) {
    console.log("updateCurruntDateRecord Skip");
    return;
  }
  isupdateCurruntDateRecordRunning = true;
  try {
    console.info("inside score cron updateCurruntDateRecord");
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
    console.log("updateInjuryRecored Skip");
    return;
  }
  isupdateInjuryRecoredRunning = true;
  try {
    console.info("inside score cron updateInjuryRecored");
    await mlbService.updateInjuryRecored();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateInjuryRecoredRunning = false;
  }
});

let isupdateStandingRecordRunning: boolean = false;
const updateStandingRecord = cron.schedule("* * * * *", async () => {
  if (isupdateStandingRecordRunning) {
    console.log("updateStandingRecord Skip");
    return;
  }
  isupdateStandingRecordRunning = true;
  try {
    console.info("inside score cron updateStandingRecord");
    await mlbService.updateStandingRecord();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateStandingRecordRunning = false;
  }
});

let isupdateTeamStatsRunning: boolean = false;
const updateTeamStats = cron.schedule("* * * * *", async () => {
  if (isupdateTeamStatsRunning) {
    console.log("updateTeamStats Skip");
    return;
  }
  isupdateTeamStatsRunning = true;
  try {
    console.info("inside score cron updateTeamStats");
    await mlbService.updateTeamStats();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateTeamStatsRunning = false;
  }
});

let isupdatePlayerStatsRunning: boolean = false;
const updatePlayerStats = cron.schedule("* * * * *", async () => {
  if (isupdatePlayerStatsRunning) {
    console.log("updatePlayerStats Skip");
    return;
  }
  isupdatePlayerStatsRunning = true;
  try {
    console.info("inside score cron updatePlayerStats");
    await mlbService.updatePlayerStats();
  } catch (error) {
    console.log(error);
  } finally {
    isupdatePlayerStatsRunning = false;
  }
});

export default {
  createAndUpdateOdds,
  updateCurruntDateRecord,
  updateStandingRecord,
  updateTeamStats,
  updateInjuryRecored,
  updatePlayerStats,
};
