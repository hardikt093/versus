import cron from "node-cron";
import moment from "moment";
import goalserveNbaService from "../../goalserve/NBA/nba.service";

let isgetLiveMatchNBARunning: boolean = false;
const getLiveMatchNba = cron.schedule("*/10 * * * * *", async () => {
  if (isgetLiveMatchNBARunning) {
    console.log("getLiveMatchNBA Skip");
    return;
  }
  isgetLiveMatchNBARunning = true;
  try {
    console.info("inside score cron getLiveMatchNBA");
    await goalserveNbaService.getLiveDataOfNba(
      moment().startOf("day").utc().toISOString() as string
    );
  } catch (error) {
    console.log(error);
  } finally {
    isgetLiveMatchNBARunning = false;
  }
});

let isgetUpcommingMatchNbaRunning: boolean = false;
const getUpcommingMatchNba = cron.schedule("*/10 * * * * *", async () => {
  if (isgetUpcommingMatchNbaRunning) {
    console.log("getUpcommingMatchNba Skip");
    return;
  }
  isgetUpcommingMatchNbaRunning = true;
  try {
    console.info("inside score cron getUpcommingMatchNba");
    await goalserveNbaService.getUpcommingMatchNba();
  } catch (error) {
    console.log(error);
  } finally {
    isgetUpcommingMatchNbaRunning = false;
  }
});

let isgetFinalMatchNbaRunning: boolean = false;
const getFinalMatchNba = cron.schedule("*/10 * * * * *", async () => {
  if (isgetFinalMatchNbaRunning) {
    console.log("getFinalMatchNba Skip");
    return;
  }
  isgetFinalMatchNbaRunning = true;
  try {
    console.info("inside score cron getFinalMatchNba");
    await goalserveNbaService.getFinalMatchNba();
  } catch (error) {
    console.log(error);
  } finally {
    isgetFinalMatchNbaRunning = false;
  }
});

let isliveBoxscoreNBARunning: boolean = false;
const liveBoxscoreNba = cron.schedule("*/10 * * * * *", async () => {
  if (isliveBoxscoreNBARunning) {
    console.log("liveBoxscoreNBA Skip");
    return;
  }
  isliveBoxscoreNBARunning = true;
  try {
    console.info("inside score cron liveBoxscoreNBA");
    await goalserveNbaService.liveBoxscoreNBA(
      moment().startOf("day").utc().toISOString() as string
    );
  } catch (error) {
    console.log(error);
  } finally {
    isliveBoxscoreNBARunning = false;
  }
});

export default {
  getFinalMatchNba,
  getUpcommingMatchNba,
  getLiveMatchNba,
  liveBoxscoreNba,
};
