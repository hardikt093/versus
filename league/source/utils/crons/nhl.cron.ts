import cron from "node-cron";

import goalserveService from "../../goalserve/NHL/goalserve.service";
import moment from "moment";

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
var createAndUpdateOddsNhl = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron createAndUpdateOddsNhl");
    await goalserveService.createAndUpdateOddsNhl();
});
var getLiveMatchNhl = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron getLiveMatchNHL");
    await goalserveService.getLiveDataOfNhl({ date1: moment().startOf("day").utc().toISOString() });
});

var getUpcommingMatchNhl = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron getUpcommingMatchNhl");
    await goalserveService.getUpcommingMatchNhl();
});

var getFinalMatchNhl = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron getFinalMatchNhl");
    await goalserveService.getFinalMatchNhl();
});

var updateNhlMatch = cron.schedule("*/60 * * * * *", async () => {
    console.info("inside score cron updateNhlMatch");
    await goalserveService.updateNhlMatch();
})

var liveBoxscore = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron updateNhlMatch");
    await goalserveService.liveBoxscore({ date1: moment().startOf("day").utc().toISOString() });
})

export default {
    updateCurruntDateRecordNhl,
    updateStandingNhl,
    updatePlayersNhl,
    updateInjuredPlayerNHL,
    createAndUpdateOddsNhl,
    getLiveMatchNhl,
    updateNhlMatch,
    getUpcommingMatchNhl,
    getFinalMatchNhl,
    liveBoxscore
};
