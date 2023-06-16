import cron from "node-cron";

import goalserveService from "../../goalserve/NHL/nhl.service";
import moment from "moment";

let isgetLiveMatchNHLRunning: boolean = false;
const getLiveMatchNhl = cron.schedule("*/10 * * * * *", async () => {
  if (isgetLiveMatchNHLRunning) {
    console.log("getLiveMatchNHL Skip");
    return;
  }
  isgetLiveMatchNHLRunning = true;
  try {
    console.info("inside score cron getLiveMatchNHL");
    await goalserveService.getLiveDataOfNhl(
      moment().startOf("day").utc().toISOString()
    );
  } catch (error) {
    console.log(error);
  } finally {
    isgetLiveMatchNHLRunning = false;
  }
});

let isgetUpcommingMatchNhlRunning: boolean = false;
const getUpcommingMatchNhl = cron.schedule("*/10 * * * * *", async () => {
  if (isgetUpcommingMatchNhlRunning) {
    console.log("getUpcommingMatchNhl Skip");
    return;
  }
  isgetUpcommingMatchNhlRunning = true;
  try {
    console.info("inside score cron getUpcommingMatchNhl");
    await goalserveService.getUpcommingMatchNhl();
  } catch (error) {
    console.log(error);
  } finally {
    isgetUpcommingMatchNhlRunning = false;
  }
});

let isgetFinalMatchNhlRunning: boolean = false;
const getFinalMatchNhl = cron.schedule("*/10 * * * * *", async () => {
  if (isgetFinalMatchNhlRunning) {
    console.log("getUpcommingMatchNhl Skip");
    return;
  }
  isgetFinalMatchNhlRunning = true;
  try {
    console.info("inside score cron getFinalMatchNhl");
    await goalserveService.getFinalMatchNhl();
  } catch (error) {
    console.log(error);
  } finally {
    isgetFinalMatchNhlRunning = false;
  }
});

let isliveBoxscoreNhlRunning: boolean = false;
const liveBoxscore = cron.schedule("*/10 * * * * *", async () => {
  if (isliveBoxscoreNhlRunning) {
    console.log("liveBoxscoreNhl Skip");
    return;
  }
  isliveBoxscoreNhlRunning = true;
  try {
    console.info("inside score cron liveBoxscoreNhl");
    await goalserveService.liveBoxscore({
      date1: moment().startOf("day").utc().toISOString(),
    });
  } catch (error) {
    console.log(error);
  } finally {
    isliveBoxscoreNhlRunning = false;
  }
});

export default {
  getLiveMatchNhl,
  getUpcommingMatchNhl,
  getFinalMatchNhl,
  liveBoxscore,
};
