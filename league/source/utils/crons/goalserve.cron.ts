import cron from "node-cron";

import goalserveService from "../../goalserve/goalserve.service";

var getUpcomingMatch = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron getUpcomingMatch");
  await goalserveService.getUpcomingMatch();
});

var getFinalMatch = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron getFinalMatch");
  await goalserveService.getFinalMatch();
});

var getLiveMatch = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron getLiveMatch");
  await goalserveService.getLiveMatch();
});

var createAndUpdateOdds = cron.schedule("*/10 * * * * *", async () => {
  console.info("inside score cron createAndUpdateOdds");
  await goalserveService.createAndUpdateOdds();
})

// var updateCurruntDateRecord = cron.schedule("*/10 * * * * *", async () => {
//   console.info("inside score cron updateCurruntDateRecord");
//   await goalserveService.updateCurruntDateRecord();
// })

// export default { getUpcomingMatch, getFinalMatch, getLiveMatch, createAndUpdateOdds };
export default { createAndUpdateOdds, getLiveMatch, getUpcomingMatch, getFinalMatch };
