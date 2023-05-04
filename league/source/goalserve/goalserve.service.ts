import httpStatus from "http-status";
import { IDivision, ITeam } from "../interfaces/input";
import { axiosGet } from "../services/axios.service";
import { goalserveApi } from "../services/goalserve.service";
import socket from "../services/socket.service";
import AppError from "../utils/AppError";
import League from "../models/documents/league.model";
import moment from "moment";
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
    const winlossArray = await getWinLost();
    const getScore = await axiosGet(
      "http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_shedule",
      { json: true, date1: "02.05.2023", date2: "03.05.2023", showodds: "1", bm: "455," }
    );

    // await Promise.all(winlossArray).then(async () => {
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
              // console.log('item?.odds?.type : ', item?.odds?.type);
              // const getMoneyLine: any = await getOdds('Home/Away', item?.odds?.type);
              // console.log('data : ', getMoneyLine);
              // // const getTotal = await getOdds('Over/Under', item.odds.type)
              // const getSpread = await getOdds('Run Line', item?.odds?.type)
              // console.log(typeof getSpread)
            // const getAwayTeamRunLine = await getRunLine(item.awayteam.name, getSpread.bookmaker.odd)
            // const getHomeTeamRunLine = await getRunLine(item.hometeam.name, getSpread.bookmaker.odd)
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
                  // teamImage: getAwayTeamImage.data.team.image,
                  won: findAwayTeamWinLose ? findAwayTeamWinLose.won : "",
                  lose: findAwayTeamWinLose ? findAwayTeamWinLose.lost : "",
                  // moneyline: getMoneyLine ? getMoneyLine.bookmaker.odd.find((item: any) => item.name === "2") : "",
                  // spread: getAwayTeamRunLine ? getAwayTeamRunLine.name.split(' ').slice(-1)[0] : ""
                },
                datetime_utc: item.datetime_utc,
                homeTeam: {
                  homeTeamName: item.hometeam.name,
                  homeTeamId: item.hometeam.id,
                  homeTeamScore: item.hometeam.totalscore,
                  // teamImage: getHomeTeamImage.data.team.image,
                  won: findHomeTeamWinLose ? findHomeTeamWinLose.won : "",
                  lose: findHomeTeamWinLose ? findHomeTeamWinLose.lost : "",
                  // moneyline: getMoneyLine ? getMoneyLine.bookmaker.odd.find((item: any) => item.name === "1") : {},
                  // spread: getHomeTeamRunLine ? getHomeTeamRunLine.name.split(' ').slice(-1)[0] : ""
                },
                // total: getTotal.bookmaker.odd,
                time: item.time,
              };
              // console.log("upcommingScoreData---", upcommingScoreData)
              upcommingScore.push(upcommingScoreData);
              // return upcommingScore;
            }
            // console.log("upcommingScore", upcommingScore)
            return upcommingScore;
          }
        );
    // console.log('table data : ', takeData, upcommingScore);
    await Promise.all(takeData).then(async (item: any) => {
      // console.log("takeData------", item)
        await socket("mlbUpcomingMatch", {
          upcommingScore
        });
      });
    // });
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

const getOdds = (nameKey: any, myArray: any) => {
  for (let i = 0; i < myArray.length; i++) {
    if (myArray[i].value === nameKey) {
      return myArray[i];
    } else {
      return;
    }
  }

}

const getRunLine = async (nameKey: any, myArray: any) => {
  for (let i = 0; i < myArray.length; i++) {
    if (myArray[i].name.split(" ").slice(0, -1).join(' ') == nameKey) {
      return myArray[i];
    }
  }
  return
}

const search = async (nameKey: any, myArray: any) => {
  for (let i = 0; i < myArray.length; i++) {
    if (myArray[i].id === nameKey) {
      return myArray[i];
    }
  }
  return
};

const getFinalMatch = async () => {
  try {
    const winlossArray = await getWinLost();
    const getScore = await axiosGet(
      "http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/usa",
      { json: true }
    );
    var getFinalMatch: any = [];
    const takeData =
      await getScore?.data?.scores?.category?.match.map(
        async (item: any) => {
          const getAwayTeamImage = await axiosGet(
            `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.awayteam.id}_rosters`,
            { json: true }
          );
          const getHomeTeamImage = await axiosGet(
            `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.hometeam.id}_rosters`,
            { json: true }
          );
          if (item.status === "Final") {
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
                teamImage: getAwayTeamImage.data.team.image,
                won: findAwayTeamWinLose ? findAwayTeamWinLose.won : "",
                lose: findAwayTeamWinLose ? findAwayTeamWinLose.lost : "",
                awayTeamRun: item.awayteam.totalscore,
                awayTeamHit: item.awayteam.hits,
                awayTeamErrors: item.awayteam.errors
              },
              datetime_utc: item.datetime_utc,
              homeTeam: {
                homeTeamName: item.hometeam.name,
                homeTeamId: item.hometeam.id,
                teamImage: getHomeTeamImage.data.team.image,
                won: findHomeTeamWinLose ? findHomeTeamWinLose.won : "",
                lose: findHomeTeamWinLose ? findHomeTeamWinLose.lost : "",
                homeTeamRun: item.hometeam.totalscore,
                homeTeamHit: item.hometeam.hits,
                homeTeamErrors: item.hometeam.errors
              },
              time: item.time,
            };
            getFinalMatch.push(upcommingScoreData);

          }
          return { getFinalMatch };
        }
      );
    await Promise.all(takeData).then(async (item: any) => {
      await socket("mlbFinalMatch", {
        getFinalMatch
      });
    });
  } catch (error) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
};

const getLiveMatch = async () => {
  try {
    const winlossArray = await getWinLost();
    const getScore = await axiosGet(
      "http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/usa",
      { json: true }
    );
    var getLiveMatch: any = [];
    const takeData =
      await getScore?.data?.scores?.category?.match.map(
        async (item: any) => {
          const getAwayTeamImage = await axiosGet(
            `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.awayteam.id}_rosters`,
            { json: true }
          );
          const getHomeTeamImage = await axiosGet(
            `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.hometeam.id}_rosters`,
            { json: true }
          );
          if (item.status !== "Not Started" && item.status !== "Final" && item.status !== "Postponed") {
            const findAwayTeamWinLose: any = await search(
              item?.awayteam?.id,
              winlossArray
            );
            const findHomeTeamWinLose: any = await search(
              item?.hometeam?.id,
              winlossArray
            );
            let liveScoreData = {
              status: item.status,
              inningNo: item?.status?.split(" ").pop(),
              id: item.data,
              awayTeam: {
                awayTeamName: item.awayteam.name,
                awayTeamId: item.awayteam.id,
                awayTeamInnings: item.awayteam.innings,
                awayTeamScore: item.awayteam.totalscore,
                teamImage: getAwayTeamImage.data.team.image,
                won: findAwayTeamWinLose ? findAwayTeamWinLose.won : "",
                lose: findAwayTeamWinLose ? findAwayTeamWinLose.lost : "",
                awayTeamRun: item.awayteam.totalscore,
                awayTeamHit: item.awayteam.hits,
                awayTeamErrors: item.awayteam.errors
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
                homeTeamRun: item.hometeam.totalscore,
                homeTeamHit: item.hometeam.hits,
                homeTeamErrors: item.hometeam.errors
              },
              oddsid: item.oddsid,
              time: item.time,
              timezone: item.timezone,
              out: item.outs
            };
            getLiveMatch.push(liveScoreData);

          }
          return { getLiveMatch };
        }
      );
    await Promise.all(takeData).then(async (item: any) => {
      await socket("mlbLiveMatch", {
        getLiveMatch
      });
    });
  } catch (error) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
}

const mlbScoreWithDate = async (params: any) => {
  let day = moment(params.date1).format("DD")
  let month = moment(params.date1).format("MM")
  let year = moment(params.date1).format("YYYY")
  let date = `${day}.${month}.${year}`
  console.log("date", date)
  try {

    const winlossArray = await getWinLost();
    const getScore = await axiosGet(
      "http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_shedule",
      { json: true, date1: date }
    );
    var upcommingScore: any = [];
    var getFinalMatch: any = [];
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
          } else if (item.status === "Final") {
            const findAwayTeamWinLose: any = await search(
              item?.awayteam?.id,
              winlossArray
            );
            const findHomeTeamWinLose: any = await search(
              item?.hometeam?.id,
              winlossArray
            );
            let finalScoreData = {
              status: item.status,
              id: item.id,
              awayTeam: {
                awayTeamName: item.awayteam.name,
                awayTeamId: item.awayteam.id,
                teamImage: getAwayTeamImage.data.team.image,
                won: findAwayTeamWinLose ? findAwayTeamWinLose.won : "",
                lose: findAwayTeamWinLose ? findAwayTeamWinLose.lost : "",
                awayTeamRun: item.awayteam.totalscore,
                awayTeamHit: item.awayteam.hits,
                awayTeamErrors: item.awayteam.errors
              },
              datetime_utc: item.datetime_utc,
              homeTeam: {
                homeTeamName: item.hometeam.name,
                homeTeamId: item.hometeam.id,
                teamImage: getHomeTeamImage.data.team.image,
                won: findHomeTeamWinLose ? findHomeTeamWinLose.won : "",
                lose: findHomeTeamWinLose ? findHomeTeamWinLose.lost : "",
                homeTeamRun: item.hometeam.totalscore,
                homeTeamHit: item.hometeam.hits,
                homeTeamErrors: item.hometeam.errors
              },
              time: item.time,
            };
            getFinalMatch.push(finalScoreData);

          }
          return { upcommingScore, getFinalMatch };
        }
      );
    return await Promise.all(takeData).then(async (item: any) => {
      return { upcommingScore, getFinalMatch }
    });
  } catch (error: any) {
    console.log("error in catch", error)
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
}


export default { getMLBStandings, getUpcomingMatch, getWinLost, search, getOdds, getRunLine, getFinalMatch, getLiveMatch, mlbScoreWithDate };
