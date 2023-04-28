import cron from "node-cron";

import goalserveService from "../../goalserve/goalserve.service";

var getUpcomingMatch = cron.schedule("*/5 * * * * *", async () => {
  console.log("inside score cron");
  await goalserveService.getUpcomingMatch();
});

export default { getUpcomingMatch };
