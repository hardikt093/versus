import cron from "node-cron";

import NcaafService from "../../../goalserve/NCAAF/db.cron.service";
const ncaafService = new NcaafService();

let isupdateStandingRecordRunning: boolean = false;
// const updateStandingRecord = cron.schedule("0 0 */1 * * *", async () => {
//   if (isupdateStandingRecordRunning) {
//     return;
//   }
//   isupdateStandingRecordRunning = true;
//   try {
//     await ncaafService.addNCAAFStandings();
//   } catch (error) {
//   } finally {
//     isupdateStandingRecordRunning = false;
//   }
// }
// )
let isUpdateNcaafUpcommingMatch: boolean = false;

const updateNflUpcommingMatch = cron.schedule("*/10 * * * * *", async () => {
  if (isUpdateNcaafUpcommingMatch) {
    return;
  }
  isUpdateNcaafUpcommingMatch = true;
  try {
    await ncaafService.updateNcaafMatch();
  } catch (error) {
    console.log(error);
  } finally {
    isUpdateNcaafUpcommingMatch = false;
  }
});

let isUpdateLiveMatch: boolean = false;
const updateLiveMatch = cron.schedule("*/10 * * * * *", async () => {
  console.log("isupdateFinalMatchNfl Skip");
  if (isUpdateLiveMatch) {
    return;
  }
  isUpdateLiveMatch = true;
  try {
    await ncaafService.updateLiveMatch();
    // await ncaafService.addOrUpdateDriveInLive();
  } catch (error) {
    console.log(error);
  } finally {
    isUpdateLiveMatch = false;
  }
});

let isupdatePlayerRecordRunning: boolean = false;
const updatePlayerRecord = cron.schedule("0 0 */1 * * *", async () => {
  if (isupdatePlayerRecordRunning) {
    return;
  }
  isupdatePlayerRecordRunning = true;
  try {
    await ncaafService.addPlayers();
  } catch (error) {
  } finally {
    isupdatePlayerRecordRunning = false;
  }
});

let isupdateTeamStatsNCAAfRunning: boolean = false;
const updateTeamStatsNcaaf = cron.schedule("0 0 */1 * * *", async () => {
  console.log("isupdateTeamStatsNCAAFRunning Skip");
  if (isupdateTeamStatsNCAAfRunning) {
    return;
  }
  isupdateTeamStatsNCAAfRunning = true;
  try {
    await ncaafService.addTeamStats();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateTeamStatsNCAAfRunning = false;
  }
});
let isupdateMatchStats: boolean = false;
const updateMatchStatsNcaaf = cron.schedule("*/10 * * * * *", async () => {
  if (isupdateMatchStats) {
    return;
  }
  isupdateMatchStats = true;
  try {
    await ncaafService.addMatchTeamStats();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateMatchStats = false;
  }
});

let isOddAdded: boolean = false;
const oddAdded = cron.schedule("*/10 * * * * *", async () => {
  console.log("isOddAdded========= Skip");
  if (isOddAdded) {
    return;
  }
  isOddAdded = true;
  try {
    await ncaafService.createOdds();
  } catch (error) {
    console.log(error);
  } finally {
    isOddAdded = false;
  }
});
export default {
  updateTeamStatsNcaaf,
  updatePlayerRecord,
  updateNflUpcommingMatch,
  updateLiveMatch,
  updateMatchStatsNcaaf,
  oddAdded
};
