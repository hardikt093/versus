import cron from "node-cron";

import NcaafService from "../../../goalserve/NCAAF/db.cron.service";
const ncaafService = new NcaafService();

let isupdateStandingRecordRunning: boolean = false;
const updateStandingRecord = cron.schedule("*/5 * * * * *", async () => {
  if (isupdateStandingRecordRunning) {
    return;
  }
  isupdateStandingRecordRunning = true;
  try {
    await ncaafService.addNCAAFStandings();
  } catch (error) {
  } finally {
    isupdateStandingRecordRunning = false;
  }
}
)
let isUpdateNcaafUpcommingMatch: boolean = false;

const updateNflUpcommingMatch = cron.schedule("0 0 */1 * * *", async () => {
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
  if (isUpdateLiveMatch) {
    // console.log("updateLiveMatch NCAAF Skip", new Date());
    return;
  }
  isUpdateLiveMatch = true;
  try {
    // console.info("inside updateLiveMatch", new Date());
    await ncaafService.updateLiveMatch();
    await ncaafService.addOrUpdateDriveInLive();
  } catch (error) {
    Date;
    console.log(error);
  } finally {
    isUpdateLiveMatch = false;
  }
});

let isupdatePlayerRecordRunning: boolean = false;
const updatePlayerRecord = cron.schedule("*/10 * * * * *", async () => {
  if (isupdatePlayerRecordRunning) {
    // console.log("updatePlayerRecord Skip", new Date());
    return;
  }
  isupdatePlayerRecordRunning = true;
  try {
    // console.info("inside updatePlayerRecord", new Date());
    await ncaafService.addPlayers();
  } catch (error) {
  } finally {
    isupdatePlayerRecordRunning = false;
  }
});

let isupdateTeamStatsNCAAfRunning: boolean = false;
const updateTeamStatsNcaaf = cron.schedule("*/10 * * * * *", async () => {
  if (isupdateTeamStatsNCAAfRunning) {
    // console.log("updateTeamStatsNcaaf Skip", new Date());
    return;
  }
  isupdateTeamStatsNCAAfRunning = true;
  try {
    // console.info("inside updateTeamStatsNcaaf", new Date());
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
    // console.log("updateMatchStatsNcaaf Skip", new Date());
    return;
  }
  isupdateMatchStats = true;
  try {
    // console.info("inside updateMatchStatsNcaaf", new Date());
    await ncaafService.addMatchTeamStats();
  } catch (error) {
    console.log(error);
  } finally {
    isupdateMatchStats = false;
  }
});

let isOddAdded: boolean = false;
const oddAdded = cron.schedule("*/5 * * * *", async () => {
  if (isOddAdded) {
    console.log("oddAdded Skip", new Date());
    return;
  }
  isOddAdded = true;
  try {
    // console.info("inside oddAdded", new Date());
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
  oddAdded,
  updateStandingRecord
};
