import cron from "node-cron";
import httpStatus from "http-status";

import { axiosGet } from "../../services/axios.service";
import AppError from "../AppError";

import { io } from "../../server";

const socket = async (socket: any, data: any): Promise<void> => {
  io.emit("updateScore", data);
};
var getScore = cron.schedule("*/5 * * * * *", async () => {
  console.log("inside score cron");
  try {
    const getScore = await axiosGet(
      "http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/usa",
      { json: true }
    );
    var winlossArray: any = [];

    const winLoss = await axiosGet(
      "https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_standings",
      { json: true }
    );
    const winLossData = await winLoss.data.standings.category.league.map(
      async (item: any) => {
        const getTeam = await item.division.map(async (item: any) => {
          const fff = Object.entries(item?.team);
          for (let index = 0; index < fff.length; index++) {
            const [key, value] = fff[index];
            winlossArray.push(value);
          }

          return winlossArray;
        });
        return getTeam;
      }
    );
    var liveScore: any = [];
    var upcommingScore: any = [];
    const takeData = await getScore?.data?.scores?.category?.match?.map(
      async (item: any) => {
        const getAwayTeamImage = await axiosGet(
          `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.awayteam.id}_rosters`,
          { json: true }
        );
        const getHomeTeamImage = await axiosGet(
          `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.hometeam.id}_rosters`,
          { json: true }
        );

        if (item.status !== "Not Started" && item.status !== "Final") {
          let liveScoreData = {
            status: item.status,
            id: item.data,
            awayTeam: {
              awayTeamName: item.awayteam.name,
              awayTeamId: item.awayteam.id,
              awayTeamInnings: item.awayteam.innings,
              awayTeamScore: item.awayteam.totalscore,
              teamImage: getAwayTeamImage.data.team.image,
            },
            date: item.date,
            datetime_utc: item.datetime_utc,
            events: item.events,
            formatted_date: item.formatted_date,
            homeTeam: {
              homeTeamName: item.hometeam.name,
              homeTeamId: item.hometeam.id,
              homeTeamInnings: item.hometeam.innings,
              homeTeamScore: item.hometeam.totalscore,
              teamImage: getHomeTeamImage.data.team.image,
            },
            oddsid: item.oddsid,
            time: item.time,
            timezone: item.timezone,
          };
          liveScore.push(liveScoreData);
          // } else {
        } else if (item.status === "Not Started") {
          var findAwayTeamWinLose = await winlossArray?.find(
            async (x: any) => (await x.id) === item?.awayteam?.id
          );
          var findHomeTeamWinLose = await winlossArray?.find(async (x: any) => {
            (await x.id) === item?.hometeam?.id;
          });
          let upcommingScoreData = {
            status: item.status,
            id: item.data,
            awayTeam: {
              awayTeamName: item.awayteam.name,
              awayTeamId: item.awayteam.id,
              awayTeamInnings: item.awayteam.innings,
              awayTeamScore: item.awayteam.totalscore,
              teamImage: getAwayTeamImage.data.team.image,
              won: findAwayTeamWinLose ? findAwayTeamWinLose.won : "",
              lose: findAwayTeamWinLose ? findAwayTeamWinLose.lost : "",
            },
            date: item.date,
            datetime_utc: item.datetime_utc,
            events: item.events,
            formatted_date: item.formatted_date,
            homeTeam: {
              homeTeamName: item.hometeam.name,
              homeTeamId: item.hometeam.id,
              homeTeamInnings: item.hometeam.innings,
              homeTeamScore: item.hometeam.totalscore,
              teamImage: getHomeTeamImage.data.team.image,
              won: findHomeTeamWinLose ? findHomeTeamWinLose.won : "",
              lose: findHomeTeamWinLose ? findHomeTeamWinLose.lost : "",
            },
            oddsid: item.oddsid,
            time: item.time,
            timezone: item.timezone,
          };

          upcommingScore.push(upcommingScoreData);
        }
        return { liveScore, upcommingScore };
      }
    );
    await Promise.all(takeData).then(async (item: any) => {
      await socket("", {
        upcommingScore,
        liveScore,
      });
    });
  } catch (error) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
});

export default { getScore, socket };
