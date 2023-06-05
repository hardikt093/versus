import cron from "node-cron";
import moment from "moment";
import goalserveNbaService from "../../goalserve/NBA/goalserve.service";

var updateCurruntDateRecordNba = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron updateCurruntDateRecordNba");
  await goalserveNbaService.updateCurruntDateRecordNba();
});

const createAndUpdateOddsNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron createAndUpdateOddsNba");
  await goalserveNbaService.createAndUpdateOddsNba();
});

var updateNbaMatch = cron.schedule("*/60 * * * * *", async () => {
  console.info("inside score cron updateNbaMatch");
  await goalserveNbaService.updateNbaMatch();
})

var updateStandingNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron updateStandingNba");
  await goalserveNbaService.addNbaStandings();
});

var updatePlayersNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron updatePlayersNba");
  await goalserveNbaService.addNbaPlayer();
});

var updateInjuredPlayerNBA = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron updateInjuredPlayerNBA");
  await goalserveNbaService.addNbaInjuredPlayer();
});

var getLiveMatchNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron getLiveMatchNHL");
  await goalserveNbaService.getLiveDataOfNba({ date1: moment().startOf("day").utc().toISOString() });
});

var getUpcommingMatchNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron getUpcommingMatchNba");
  await goalserveNbaService.getUpcommingMatchNba();
});

var getFinalMatchNba = cron.schedule("*/5 * * * * *", async () => {
  console.info("inside score cron getFinalMatchNba");
  await goalserveNbaService.getFinalMatchNba();
});

export default {
  updateCurruntDateRecordNba,
  createAndUpdateOddsNba,
  updateNbaMatch,
  updateStandingNba,
  updatePlayersNba,
  updateInjuredPlayerNBA,
  getFinalMatchNba,
  getUpcommingMatchNba,
  getLiveMatchNba
};
