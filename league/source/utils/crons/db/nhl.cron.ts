import cron from "node-cron";

import GoalserveService from "../../../goalserve/NHL/db.cron.service";
const goalserveService = new GoalserveService();

let isupdateCurruntDateRecordNhlRunning: boolean = false;
const updateCurruntDateRecordNhl = cron.schedule("*/10 * * * * *", async () => {
  if (isupdateCurruntDateRecordNhlRunning) {
    // console.log("updateCurruntDateRecordNhl Skip");
    return;
  }
  isupdateCurruntDateRecordNhlRunning = true;
  try {
    // console.info("inside score cron updateCurruntDateRecordNhl");
    await goalserveService.updateCurruntDateRecordNhl();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateCurruntDateRecordNhlRunning = false;
  }
});

let isupdateStandingNhlRunning: boolean = false;
const updateStandingNhl = cron.schedule("*/10 * * * * *", async () => {
  if (isupdateStandingNhlRunning) {
    // console.log("updateStandingNhl Skip");
    return;
  }
  isupdateStandingNhlRunning = true;
  try {
    // console.info("inside score cron updateStandingNhl");
    await goalserveService.updateStandingNhl();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateStandingNhlRunning = false;
  }
});

let isupdatePlayersNhlRunning: boolean = false;
const updatePlayersNhl = cron.schedule("*/10 * * * * *", async () => {
  if (isupdatePlayersNhlRunning) {
    // console.log("updatePlayersNhl Skip");
    return;
  }
  isupdatePlayersNhlRunning = true;
  try {
    // console.info("inside score cron updatePlayersNhl");
    await goalserveService.updatePlayersNhl();
  } catch (error) {
    console.log(error);
  } finally {
    isupdatePlayersNhlRunning = false;
  }
});

let isupdateInjuredPlayerNHLRunning: boolean = false;
const updateInjuredPlayerNHL = cron.schedule("*/1 * * * *", async () => {
  if (isupdateInjuredPlayerNHLRunning) {
    // console.log("updateInjuredPlayerNHL Skip");
    return;
  }
  isupdateInjuredPlayerNHLRunning = true;
  try {
    // console.info("inside score cron updateInjuredPlayerNHL");
    await goalserveService.updateInjuredPlayerNHL();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateInjuredPlayerNHLRunning = false;
  }
});

let iscreateAndUpdateOddsNhlRunning: boolean = false;
const createAndUpdateOddsNhl = cron.schedule("*/20 * * * * *", async () => {
  if (iscreateAndUpdateOddsNhlRunning) {
    // console.log("createAndUpdateOddsNhl Skip");
    return;
  }
  iscreateAndUpdateOddsNhlRunning = true;
  try {
    // console.info("inside score cron createAndUpdateOddsNhl");
    await goalserveService.createAndUpdateOddsNhl();
  } catch (error) {
    console.log(error);
  } finally {
    iscreateAndUpdateOddsNhlRunning = false;
  }
});

let isupdateNhlMatchRunning: boolean = false;
const updateNhlMatch = cron.schedule("* */1 * * *", async () => {
  if (isupdateNhlMatchRunning) {
    return;
  }
  isupdateNhlMatchRunning = true;
  try {
    await goalserveService.updateNhlMatch();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateNhlMatchRunning = false;
  }
});

export default {
  updateCurruntDateRecordNhl,
  updateStandingNhl,
  updatePlayersNhl,
  updateInjuredPlayerNHL,
  createAndUpdateOddsNhl,
  updateNhlMatch,
};
