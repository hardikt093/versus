import cron from "node-cron";

import NflService from "../../../goalserve/NFL/db.cron.service";
const nflService = new NflService();

let isupdateStandingRecordRunning: boolean = false;
const updateStandingRecord = cron.schedule("0 0 */1 * * *", async () => {
  if (isupdateStandingRecordRunning) {
    return;
  }
  isupdateStandingRecordRunning = true;
  try {
    await nflService.addNbaStandings();
  } catch (error) {
  } finally {
    isupdateStandingRecordRunning = false;
  }
});
let isUpdateNflUpcommingMatch: boolean = false;

const updateNflUpcommingMatch = cron.schedule("*/60 * * * * *", async () => {
  if (isupdateStandingRecordRunning) {
    return;
  }
  isUpdateNflUpcommingMatch = true;
  try {
    await nflService.updateNflMatch();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateStandingRecordRunning = false;
  }
});

let isupdatePlayersNflRunning: boolean = false;
const updatePlayersNfl = cron.schedule("0 0 */1 * * *", async () => {
  console.log("updatePlayersnfl Skip");
  if (isupdatePlayersNflRunning) {
    return;
  }
  isupdatePlayersNflRunning = true;
  try {
    await nflService.addPlayers();
  } catch (error) {
    console.log(error);
  } finally {
    isupdatePlayersNflRunning = false;
  }
});
let isupdateTeamStatsNflRunning: boolean = false;
const updateTeamStatsNfl = cron.schedule("0 0 */1 * * *", async () => {
  console.log("isupdateTeamStatsNflRunning Skip");
  if (isupdateTeamStatsNflRunning) {
    return;
  }
  isupdateTeamStatsNflRunning = true;
  try {
    await nflService.addTeamStats();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateTeamStatsNflRunning = false;
  }
});

let isUpdateLiveMatch: boolean = false;
const updateLiveMatch = cron.schedule("*/10 * * * * *", async () => {
  console.log("isupdateFinalMatchNfl Skip");
  if (isupdateTeamStatsNflRunning) {
    return;
  }
  isUpdateLiveMatch = true;
  try {
    await nflService.updateLiveMatch();
    await nflService.addOrUpdateDriveInLive()
  } catch (error) {
    console.log(error);
  } finally {
    isUpdateLiveMatch = false;
  }
});

let isupdateInjuredPlayernflRunning: boolean = false;
const updateInjuredPlayerNFL = cron.schedule("*/10 * * * * *", async () => {
  if (isupdateInjuredPlayernflRunning) {
    return;
  }
  isupdateInjuredPlayernflRunning = true;
  try {
    await nflService.addInjuredPlayer();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateInjuredPlayernflRunning = false;
  }
});

let isOddAdded: boolean = false;
const oddAdded = cron.schedule("*/10 * * * * *", async () => {
  console.log("isOddAdded Skip");
  if (isupdateTeamStatsNflRunning) {
    return;
  }
  isOddAdded = true;
  try {
    await nflService.createOdds();
  } catch (error) {
    console.log(error);
  } finally {
    isOddAdded = false;
  }
});

let isupdateMatchStats: boolean = false;
const updateMatchStatsNFL = cron.schedule("*/10 * * * * *", async () => {
  if (isupdateMatchStats) {
    return;
  }
  isupdateMatchStats = true;
  try {
    await nflService.addMatchTeamStats();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateMatchStats = false;
  }
});






export default {
  updateStandingRecord,
  updateNflUpcommingMatch,
  updatePlayersNfl,
  updateTeamStatsNfl,
  updateLiveMatch,
  updateInjuredPlayerNFL,
  oddAdded,
  updateMatchStatsNFL
};
