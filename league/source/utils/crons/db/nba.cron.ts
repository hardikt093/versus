import cron from "node-cron";
import moment from "moment";
import GoalserveNbaService from "../../../goalserve/NBA/db.cron.service";
const goalserveNbaService = new GoalserveNbaService();

let createAndUpdateMatchOddsRunnig : boolean = false;
const createAndUpdateOddsNba = cron.schedule("*/1 * * * * *", async () => {
    if (createAndUpdateMatchOddsRunnig) {
        console.log("createAndUpdateMatchOdds Skip");
        return;
    }
    createAndUpdateMatchOddsRunnig = true;
    try {
        console.info("inside score cron createAndUpdateOddsNba");
        await goalserveNbaService.createAndUpdateMatchOdds();
    } catch (error) {
        console.log(error);
    } finally {
        createAndUpdateMatchOddsRunnig  =  false;
    }
})
export default {
    createAndUpdateOddsNba
}