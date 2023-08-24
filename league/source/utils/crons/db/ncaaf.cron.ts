import cron from "node-cron";

import NcaafService from "../../../goalserve/NCAAF/db.cron.service";
const ncaafService = new NcaafService();

let isupdateStandingRecordRunning: boolean = false;
const updateStandingRecord = cron.schedule("0 * * * *", async () => {
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
});

export default {
    updateStandingRecord,
  };
  