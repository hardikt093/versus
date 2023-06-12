import cron from "node-cron";

import goalserveService from "../../goalserve/MLB/goalserve.service";
import moment from "moment";

var getUpcomingMatch = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron getUpcomingMatch");
    await goalserveService.getUpcomingMatch();
});

var getFinalMatch = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron getFinalMatch");
    await goalserveService.getFinalMatch();
});

var getLiveMatch = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron getLiveMatch");
    await goalserveService.getLiveMatch();
});

// var createAndUpdateOdds = cron.schedule("*/5 * * * * *", async () => {
//     console.info("inside score cron createAndUpdateOdds");
//     await goalserveService.createAndUpdateOdds();
// });

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


export default {
    // createAndUpdateOdds,
    getLiveMatch,
    getUpcomingMatch,
    getFinalMatch,
    updateCurruntDateRecord,
    updateStandingRecord,
    updateTeamStats,
}; 
