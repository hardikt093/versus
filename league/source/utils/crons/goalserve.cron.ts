import cron from "node-cron";

import goalserveService from "../../goalserve/goalserve.service";

var getUpcomingMatch = cron.schedule("*/10 * * * * *", async () => {
  console.log("inside score cron getUpcomingMatch");
  await goalserveService.getUpcomingMatch();
});

var getFinalMatch = cron.schedule("*/10 * * * * *", async () => {
  console.log("inside score cron getFinalMatch");
  await goalserveService.getFinalMatch();
});

var getLiveMatch = cron.schedule("*/10 * * * * *", async () => {
  console.log("inside score cron getLiveMatch");
  await goalserveService.getLiveMatch();
});

export default { getUpcomingMatch, getFinalMatch, getLiveMatch };
