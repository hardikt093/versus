import cron from "node-cron";

import goalserveService from "../../goalserve/goalserve.service";

var getUpcomingMatch = cron.schedule("0 0 */1 * * *", async () => {
  console.info("inside score cron getUpcomingMatch");
  await goalserveService.getUpcomingMatch();
});

var getFinalMatch = cron.schedule("0 0 */1 * * *", async () => {
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
var updateInjuryRecored = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron updateInjuryRecored");
  await goalserveService.updateInjuryRecored();
});
var updateStandingRecord = cron.schedule("* * * * *", async () => {
  console.info("inside score cron updateStandingRecord");
  await goalserveService.updateStandingRecord();
});
var updateTeamStats = cron.schedule("* * * * *", async () => {
  console.info("inside score cron updateTeamStats");
  await goalserveService.updateTeamStats();
});
var updatePlayerStats = cron.schedule("* * * * *", async () => {
  console.info("inside score cron updatePlayerStats");
  await goalserveService.updatePlayerStats();
});
// NHL
var updateCurruntDateRecordNhl = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron updateCurruntDateRecordNhl");
  await goalserveService.updateCurruntDateRecordNhl();
});

var updateStandingNhl = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron updateStandingNhl");
  await goalserveService.updateStandingNhl();
});

var updatePlayersNhl = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron updatePlayersNhl");
  await goalserveService.updatePlayersNhl();
});

var updateInjuredPlayerNHL = cron.schedule("*/10 * * * *", async () => {
  console.info("inside score cron updateInjuredPlayerNHL");
  await goalserveService.updateInjuredPlayerNHL();
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
  updateInjuryRecored,
  updateStandingRecord,
  updateTeamStats,
  updateInjuredPlayerNHL
};
