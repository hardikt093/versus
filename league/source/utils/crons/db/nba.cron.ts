import cron from "node-cron";
import moment from "moment";
import GoalserveNbaService from "../../../goalserve/NBA/db.cron.service";
const goalserveNbaService = new GoalserveNbaService();

let createAndUpdateMatchOddsRunning: boolean = false;
const createAndUpdateOddsNba = cron.schedule("*/5 * * * * *", async () => {
  if (createAndUpdateMatchOddsRunning) {
    console.log("createAndUpdateMatchOdds Skip");
    return;
  }
  createAndUpdateMatchOddsRunning = true;
  try {
    console.info("inside score cron createAndUpdateOddsNba");
    await goalserveNbaService.createAndUpdateMatchOdds();
  } catch (error) {
    console.log(error);
  } finally {
    createAndUpdateMatchOddsRunning = false;
  }
});

let isUpdateCurruntDateRecordNbaRunning: boolean = false;
const updateCurruntDateRecordNba = cron.schedule("*/10 * * * * *", async () => {
  if (isUpdateCurruntDateRecordNbaRunning) {
    console.log("updateCurruntDateRecordNba Skip");
    return;
  }
  isUpdateCurruntDateRecordNbaRunning = true;
  try {
    console.info("inside score cron updateCurruntDateRecordNba");
    await goalserveNbaService.updateCurruntDateRecordNba();
  } catch (error) {
    console.log(error);
  } finally {
    isUpdateCurruntDateRecordNbaRunning = false;
  }
});

let isupdateNbaMatchRunning: boolean = false;
const updateNbaMatch = cron.schedule("*/60 * * * * *", async () => {
  if (isupdateNbaMatchRunning) {
    console.log("updateNbaMatch Skip");
    return;
  }
  isupdateNbaMatchRunning = true;
  try {
    console.info("inside score cron updateNbaMatch");
    await goalserveNbaService.updateNbaMatch();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateNbaMatchRunning = false;
  }
});

let isupdateStandingNbaRunning: boolean = false;
const updateStandingNba = cron.schedule("*/5 * * * * *", async () => {
  if (isupdateStandingNbaRunning) {
    console.log("updateStandingNba Skip");
    return;
  }
  isupdateNbaMatchRunning = true;
  try {
    console.info("inside score cron updateStandingNba");
    await goalserveNbaService.addNbaStandings();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateStandingNbaRunning = false;
  }
});

let isupdatePlayersNbaRunning: boolean = false;
const updatePlayersNba = cron.schedule("*/5 * * * * *", async () => {
    if (isupdatePlayersNbaRunning) {
        console.log("updatePlayersNba Skip");
        return;
      }
      isupdatePlayersNbaRunning = true;
      try {
          console.info("inside score cron updatePlayersNba");
          await goalserveNbaService.addNbaPlayer();
      } catch (error) {
        console.log(error);
      } finally {
        isupdatePlayersNbaRunning = false;
      }
});

let isupdateInjuredPlayerNBARunning: boolean = false;
const updateInjuredPlayerNBA = cron.schedule("*/10 * * * * *", async () => {
    if (isupdateInjuredPlayerNBARunning) {
        console.log("updateInjuredPlayerNBA Skip");
        return;
      }
      isupdateInjuredPlayerNBARunning = true;
      try {
        console.info("inside score cron updateInjuredPlayerNBA");
        await goalserveNbaService.addNbaInjuredPlayer();
      } catch (error) {
        console.log(error);
      } finally {
        isupdateInjuredPlayerNBARunning = false;
      }
  
});

let isupdateScoreSummaryRunning: boolean = false;
const updateScoreSummary = cron.schedule("*/5 * * * * *", async () => {
    if (isupdateScoreSummaryRunning) {
        console.log("updateScoreSummary Skip");
        return;
      }
      isupdateScoreSummaryRunning = true;
      try {
        console.info("inside score cron updateScoreSummary");
  await goalserveNbaService.updateScoreSummary();
      } catch (error) {
        console.log(error);
      } finally {
        isupdateScoreSummaryRunning = false;
      }
  
});

export default {
  updateCurruntDateRecordNba,
  createAndUpdateOddsNba,
  updateNbaMatch,
  updateStandingNba,
  updatePlayersNba,
  updateInjuredPlayerNBA,
  updateScoreSummary,
};
