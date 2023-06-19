import cron from "node-cron";
import mlbService from "../../goalserve/MLB/mlb.service";

let isgetUpcomingMatchRunning: boolean = false;
const getUpcomingMatch = cron.schedule("*/10 * * * * *", async () => {
  if (isgetUpcomingMatchRunning) {
    console.log("getUpcomingMatch Skip");
    return;
  }
  isgetUpcomingMatchRunning = true;
  try {
    console.info("inside score cron getUpcomingMatch");
    await mlbService.getUpcomingMatch();
  } catch (error) {
    console.log(error);
  } finally {
    isgetUpcomingMatchRunning = false;
  }
});

let isgetFinalMatchRunning: boolean = false;
const getFinalMatch = cron.schedule("*/10 * * * * *", async () => {
  if (isgetFinalMatchRunning) {
    console.log("getFinalMatch Skip");
    return;
  }
  isgetFinalMatchRunning = true;
  try {
    console.info("inside score cron getFinalMatch");
    await mlbService.getFinalMatch();
  } catch (error) {
    console.log(error);
  } finally {
    isgetFinalMatchRunning = false;
  }
});

let isgetLiveMatchRunning: boolean = false;
const getLiveMatch = cron.schedule("*/10 * * * * *", async () => {
  if (isgetLiveMatchRunning) {
    console.log("getLiveMatch Skip");
    return;
  }
  isgetLiveMatchRunning = true;
  try {
    console.info("inside score cron getLiveMatch");
    await mlbService.getLiveMatch();
  } catch (error) {
    console.log(error);
  } finally {
    isgetLiveMatchRunning = false;
  }
});

// let isgetLiveMatchRunning: boolean = false;
// const getLiveMatch = cron.schedule("*/10 * * * * *", async () => {
//     if (isgetLiveMatchRunning) {
//         console.log("getLiveMatch Skip");
//         return;
//     }
//     isgetLiveMatchRunning = true;
//     try {
//         console.info("inside score cron getLiveMatch");
//         await mlbService.getLiveMatch();
//     } catch (error) {
//         console.log(error);
//     } finally {
//         isgetLiveMatchRunning = false;
//     }
// });

export default {
  getLiveMatch,
  getUpcomingMatch,
  getFinalMatch,
};
