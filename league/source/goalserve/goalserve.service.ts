import httpStatus from "http-status";
import { IDivision, ITeam } from "../interfaces/input";
import { axiosGet } from "../services/axios.service";
import { goalserveApi } from "../services/goalserve.service";
import socket from "../services/socket.service";
import AppError from "../utils/AppError";
function camelize(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

const transformLeague = async (getResponse: any, data: any) => {
  return new Promise(async (resolve, reject) => {
    try {
      const leagues = getResponse?.data?.standings?.category?.league;
      const transformedLeagues = [];
      for (let i = 0; i < leagues.length; i++) {
        const league = leagues[i];
        const leagueTransform: any = [];
        const divisions = league.division;
        await Promise.all(
          divisions.map(async (division: IDivision) => {
            const teams = division.team;
            await Promise.all(
              teams.map(async (team: ITeam) => {
                const getAwayTeamImage = await goalserveApi(
                  "https://www.goalserve.com/getfeed",
                  data,
                  `baseball/${team.id}_rosters`
                );
                team.teamImage = getAwayTeamImage.data.team.image;
                team.pct = Math.round(
                  (Number(team.won) * 100) /
                    (Number(team.won) + Number(team.lost))
                );
              })
            );
            leagueTransform.push({ teams: teams, name: division.name });
          })
        );
        transformedLeagues.push({ [league.name]: leagueTransform });
      }
      resolve(transformedLeagues);
    } catch (error) {
      reject(error);
    }
  });
};
const getMLBStandings = async () => {
  let data = {
    json: true,
  };
  const getResponse = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    "baseball/mlb_standings"
  );

  const transformedLeagues: any = await transformLeague(getResponse, data);

  return transformedLeagues?.reduce((acc: any, current: any) => {
    const leagueName = camelize(Object.keys(current)[0]);
    acc[leagueName] = current[Object.keys(current)[0]];
    return acc;
  }, {});
};

const getUpcomingMatch = async () => {
  try {
    const getScore = await axiosGet(
      "https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_shedule",
      { json: true, date1: "28.04.2023", date2: "28.04.2023" }
    );
    const winlossArray = await getWinLost();
    await Promise.all(winlossArray).then(async () => {
      var liveScore: any = [];
      var upcommingScore: any = [];
      const takeData =
        await getScore?.data?.fixtures?.category?.matches?.match.map(
          async (item: any) => {
            const getAwayTeamImage = await axiosGet(
              `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.awayteam.id}_rosters`,
              { json: true }
            );
            const getHomeTeamImage = await axiosGet(
              `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.hometeam.id}_rosters`,
              { json: true }
            );

            if (item.status === "Not Started") {
              const findAwayTeamWinLose: any = await search(
                item?.awayteam?.id,
                winlossArray
              );
              const findHomeTeamWinLose: any = await search(
                item?.hometeam?.id,
                winlossArray
              );
              let upcommingScoreData = {
                status: item.status,
                id: item.id,
                awayTeam: {
                  awayTeamName: item.awayteam.name,
                  awayTeamId: item.awayteam.id,
                  awayTeamScore: item.awayteam.totalscore,
                  teamImage: getAwayTeamImage.data.team.image,
                  won: findAwayTeamWinLose ? findAwayTeamWinLose.won : "",
                  lose: findAwayTeamWinLose ? findAwayTeamWinLose.lost : "",
                },
                datetime_utc: item.datetime_utc,
                homeTeam: {
                  homeTeamName: item.hometeam.name,
                  homeTeamId: item.hometeam.id,
                  homeTeamScore: item.hometeam.totalscore,
                  teamImage: getHomeTeamImage.data.team.image,
                  won: findHomeTeamWinLose ? findHomeTeamWinLose.won : "",
                  lose: findHomeTeamWinLose ? findHomeTeamWinLose.lost : "",
                },
                time: item.time,
              };

              upcommingScore.push(upcommingScoreData);
            }
            return { liveScore, upcommingScore };
          }
        );
      await Promise.all(takeData).then(async (item: any) => {
        await socket("updateScore", {
          upcommingScore,
          liveScore,
        });
      });
    });
  } catch (error) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
};

const getWinLost = async () => {
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
  return winlossArray;
};

const search = async (nameKey: any, myArray: any) => {
  for (let i = 0; i < myArray.length; i++) {
    if (myArray[i].id === nameKey) {
      return myArray[i];
    }
  }
};

export default { getMLBStandings, getUpcomingMatch, getWinLost, search };
