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

let isupdatePlayersNflRunning: boolean = false;
const updatePlayersNfl = cron.schedule("*/10 * * * * *", async () => {
  console.log("updatePlayersnfl Skip");
  if (isupdatePlayersNflRunning) {

    return;
  }
  isupdatePlayersNflRunning = true;
  try {
    // console.info("inside score cron updatePlayersNba");
    await nflService.addPlayers();
  } catch (error) {
    console.log(error);
  } finally {
    isupdatePlayersNflRunning = false;
  }
});
export default {
  updateStandingRecord,
  updatePlayersNfl
};
