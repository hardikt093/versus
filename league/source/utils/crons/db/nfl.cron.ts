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
  }  finally {
    isupdateStandingRecordRunning = false;
  }
})

let isupdatePlayersNflRunning: boolean = false;
const updatePlayersNfl = cron.schedule("*/10 * * * * *", async () => {
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
export default {
  updateStandingRecord,
  updateNflUpcommingMatch,
  updatePlayersNfl
};
