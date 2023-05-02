import cron from "node-cron";

import goalserveService from "../../goalserve/goalserve.service";

var getUpcomingMatch = cron.schedule("0 0 */3 * * *", async () => {
  console.log("inside score cron getUpcomingMatch");
  await goalserveService.getUpcomingMatch();
});

var getFinalMatch = cron.schedule("*/10 * * * * *", async () => {
  console.log("inside score cron getFinalMatch");
  await goalserveService.getFinalMatch();
});

export default { getUpcomingMatch, getFinalMatch };
