import cron from "node-cron";

import goalserveService from "../../goalserve/goalserve.service";

var getUpcomingMatch = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron getUpcomingMatch");
  await goalserveService.getUpcomingMatch();
});

var getFinalMatch = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron getFinalMatch");
  await goalserveService.getFinalMatch();
});

var getLiveMatch = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron getLiveMatchNHL");
  await goalserveService.getLiveDataOfNhl("");
});

var getLiveMatch = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron getLiveMatch");
  await goalserveService.getLiveMatch();
});

var createAndUpdateOdds = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron createAndUpdateOdds");
  await goalserveService.createAndUpdateOdds();
});

var updateCurruntDateRecord = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron updateCurruntDateRecord");
  await goalserveService.updateCurruntDateRecord();
});

// NHL
var updateCurruntDateRecordNhl = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron updateCurruntDateRecordNhl");
  await goalserveService.updateCurruntDateRecordNhl();
});

var updateStandingNhl = cron.schedule("* * * * *", async () => {
  console.info("inside score cron updateStandingNhl");
  await goalserveService.updateStandingNhl();
});

var updatePlayersNhl = cron.schedule("* * * * *", async () => {
  console.info("inside score cron updatePlayersNhl");
  await goalserveService.updatePlayersNhl();
});
export default {
  createAndUpdateOdds,
  getLiveMatch,
  getUpcomingMatch,
  getFinalMatch,
  updateCurruntDateRecord,
  updateCurruntDateRecordNhl,
  updateStandingNhl,
  updatePlayersNhl,
};
