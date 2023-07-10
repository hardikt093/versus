import mlbService from "../MLB/mlb.service";
import nbaService from "../NBA/nba.service";
import nhlService from "../NHL/nhl.service";

const upcoming2DaysMatch = async (date: string, type: string) => {
    try {
        switch (type) {
            case "MLB":
                return await mlbService.get2DaysUpcomingDataFromMongodb(date)
            case "NHL":
                return await nhlService.get2DaysNhlScore(date)
            case "NBA":
                return await nbaService.get2DaysNbaScore(date)
            default:
                return false;
        }
    } catch (error) {
        console.log("error", error)
    }


}

export default {
    upcoming2DaysMatch
}