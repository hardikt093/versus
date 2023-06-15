import cron from "node-cron";

import GoalserveService from "../../../goalserve/NHL/db.cron.service";
const goalserveService = new GoalserveService();

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
var updateNhlMatch = cron.schedule("*/60 * * * * *", async () => {
    console.info("inside score cron updateNhlMatch");
    await goalserveService.updateNhlMatch();
})


export default {
    updateCurruntDateRecordNhl,
    updateStandingNhl,
    updatePlayersNhl,
    updateInjuredPlayerNHL,
    createAndUpdateOddsNhl,
    updateNhlMatch,
};
