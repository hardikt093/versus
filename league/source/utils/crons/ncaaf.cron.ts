import cron from "node-cron";

import goalserveService from "../../goalserve/NCAAF/ncaaf.service";
import moment from "moment";

let isScoreWithWeek: boolean = false;
const scoreWithWeek = cron.schedule("*/10 * * * * *", async () => {
  console.log("isScoreWithWeek Skip");
  if (isScoreWithWeek) {
    return;
  }
  isScoreWithWeek = true;
  try {
    await goalserveService.scoreWithWeek();
  } catch (error) {
    console.log(error);
  } finally {
    isScoreWithWeek = false;
  }
});
// let isliveDataOfBoxscore: boolean = false;
// const liveDataOfBoxscore = cron.schedule("*/10 * * * * *", async () => {
//   console.log("liveDataOfBoxscore Skip");
//   if (isliveDataOfBoxscore) {
//     return;
//   }
//   isliveDataOfBoxscore = true;
//   try {
//     await goalserveService.getLiveBoxscoreDataOfNFl();
//   } catch (error) {
//     console.log(error);
//   } finally {
//     isScoreWithWeek = false;
//   }
// });



export default {
    scoreWithWeek,
    // liveDataOfBoxscore
};
