import cron from "node-cron";

import mlbService from "../../goalserve/MLB/mlb.service";
var getUpcomingMatch = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron getUpcomingMatch");
    await mlbService.getUpcomingMatch();
});

var getFinalMatch = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron getFinalMatch");
    await mlbService.getFinalMatch();
});

var getLiveMatch = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron getLiveMatch");
    await mlbService.getLiveMatch();
});

var createAndUpdateOdds = cron.schedule("*/50 * * * * *", async () => {
    console.info("inside score cron createAndUpdateOdds");
    await mlbService.createAndUpdateOdds();
});

var updateCurruntDateRecord = cron.schedule("*/5 * * * * *", async () => {
    console.info("inside score cron updateCurruntDateRecord");
    await mlbService.updateCurruntDateRecord();
});
var updateInjuryRecored = cron.schedule("*/10 * * * * *", async () => {
    console.info("inside score cron updateInjuryRecored");
    await mlbService.updateInjuryRecored();
});
var updateStandingRecord = cron.schedule("* * * * *", async () => {
    console.info("inside score cron updateStandingRecord");
    await mlbService.updateStandingRecord();
});
var updateTeamStats = cron.schedule("* * * * *", async () => {
    console.info("inside score cron updateTeamStats");
    await mlbService.updateTeamStats();
});
var updatePlayerStats = cron.schedule("* * * * *", async () => {
    console.info("inside score cron updatePlayerStats");
    await mlbService.updatePlayerStats();
});



export default {
    createAndUpdateOdds,
    getLiveMatch,
    getUpcomingMatch,
    getFinalMatch,
    updateCurruntDateRecord,
    updateStandingRecord,
    updateTeamStats,
    updateInjuryRecored,
    updatePlayerStats
}; 
