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

const updateNflUpcommingMatch = cron.schedule("*/60 * * * * *", async () => {
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
const updateLiveMatch = cron.schedule("*/5 * * * * *", async () => {
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
}
)


export default {
    // updateStandingRecord,
    updateNflUpcommingMatch,
    updateLiveMatch,
  };
  
  

