import cron from "node-cron";

import goalserveService from "../../goalserve/NFL/nfl.service";
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



export default {
    scoreWithWeek,
  
};
