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
export default {
  updateStandingRecord,
};
