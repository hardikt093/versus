import cron from "node-cron";
import moment from "moment";
import goalserveNbaService from "../../goalserve/NBA/goalserve.service";

const updateCurruntDateRecordNba = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron updateCurruntDateRecordNba");
  await goalserveNbaService.updateCurruntDateRecordNba();
});

const createAndUpdateOddsNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron createAndUpdateOddsNba");
  await goalserveNbaService.createAndUpdateOddsNba();
});

const updateNbaMatch = cron.schedule("*/60 * * * * *", async () => {
  console.info("inside score cron updateNbaMatch");
  await goalserveNbaService.updateNbaMatch();
})

const updateStandingNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron updateStandingNba");
  await goalserveNbaService.addNbaStandings();
});

const updatePlayersNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron updatePlayersNba");
  await goalserveNbaService.addNbaPlayer();
});

const updateInjuredPlayerNBA = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron updateInjuredPlayerNBA");
  await goalserveNbaService.addNbaInjuredPlayer();
});

const getLiveMatchNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron getLiveMatchNBA");
  await goalserveNbaService.getLiveDataOfNba({ date1: moment().startOf("day").utc().toISOString() });
});

const getUpcommingMatchNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron getUpcommingMatchNba");
  await goalserveNbaService.getUpcommingMatchNba();
});

const getFinalMatchNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron getFinalMatchNba");
  await goalserveNbaService.getFinalMatchNba();
});

const liveBoxscoreNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron updateNhlMatchNba");
  await goalserveNbaService.liveBoxscoreNBA({ date1: moment().startOf("day").utc().toISOString() });
})

const updateScoreSummary = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron updateScoreSummary");
  await goalserveNbaService.updateScoreSummary();
})
export default {
  updateCurruntDateRecordNba,
  createAndUpdateOddsNba,
  updateNbaMatch,
  updateStandingNba,
  updatePlayersNba,
  updateInjuredPlayerNBA,
  getFinalMatchNba,
  getUpcommingMatchNba,
  getLiveMatchNba,
  liveBoxscoreNba,
  updateScoreSummary
};
