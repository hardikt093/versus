import httpStatus from "http-status";
import { IDivision, ITeam } from "../interfaces/input";
import { axiosGet } from "../services/axios.service";
import { goalserveApi } from "../services/goalserve.service";
import socket from "../services/socket.service";
import AppError from "../utils/AppError";
import League from "../models/documents/league.model";
import moment from "moment";
import Player from "../models/documents/player.model";
import Team from "../models/documents/team.model";
import Division from "../models/documents/division.model";
import { isArray } from "lodash";
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
  let day = moment().format("DD");
  let month = moment().format("MM");
  let year = moment().format("YYYY");
  let date = `${day}.${month}.${year}`;
  try {
    const winlossArray = await getWinLost();
    const getScore = await axiosGet(
      "http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_shedule",
      { json: true, date1: date, showodds: "1", bm: "455," }
    );
    var getUpcomingMatch: any = [];
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
            const getMoneyLine: any = await getOdds(
              "Home/Away",
              item?.odds?.type
            );
            const getSpread = await getOdds("Run Line", item?.odds?.type);
            const total = await getTotal("Over/Under", item?.odds?.type);
            const totalValues = await getTotalValues(total);

            const getAwayTeamRunLine = await getRunLine(
              item?.awayteam?.name,
              getSpread?.bookmaker?.odd
            );
            const getHomeTeamRunLine = await getRunLine(
              item?.hometeam?.name,
              getSpread?.bookmaker?.odd
            );
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
                moneyline: getMoneyLine
                  ? getMoneyLine?.bookmaker?.odd?.find(
                      (item: any) => item?.name === "2"
                    )
                  : "",
                spread: getAwayTeamRunLine
                  ? getAwayTeamRunLine?.name?.split(" ").slice(-1)[0]
                  : "",
                total: totalValues,
              },
              datetime_utc: item.datetime_utc,
              homeTeam: {
                homeTeamName: item.hometeam.name,
                homeTeamId: item.hometeam.id,
                homeTeamScore: item.hometeam.totalscore,
                teamImage: getHomeTeamImage.data.team.image,
                won: findHomeTeamWinLose ? findHomeTeamWinLose.won : "",
                lose: findHomeTeamWinLose ? findHomeTeamWinLose.lost : "",
                moneyline: getMoneyLine
                  ? getMoneyLine?.bookmaker?.odd?.find(
                      (item: any) => item?.name === "1"
                    )
                  : {},
                spread: getHomeTeamRunLine
                  ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
                  : "",
                total: totalValues,
              },
              time: item.time,
            };
            getUpcomingMatch.push(upcommingScoreData);
          }
          return getUpcomingMatch;
        }
      );
    return await Promise.all(takeData).then(async (item: any) => {
      await socket("mlbUpcomingMatch", {
        getUpcomingMatch,
      });
      return getUpcomingMatch;
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

const getOdds = (nameKey: any, myArray: any) => {
  for (let i = 0; i < myArray?.length; i++) {
    if (myArray[i].value == nameKey) {
      return myArray[i];
    }
  }
};
const getTotal = (nameKey: any, myArray: any) => {
  if (myArray.length > 0) {
    for (let i = 0; i < myArray?.length; i++) {
      if (myArray[i].value == nameKey) {
        return myArray[i];
      }
    }
  }
};

const getTotalValues = async (total: any) => {
  if (total.bookmaker) {
    if (isArray(total?.bookmaker?.total)) {
      return total?.bookmaker?.total[0]?.name
        ? total?.bookmaker?.total[0]?.name
        : "_";
    } else {
      return total?.bookmaker?.total?.name
        ? total?.bookmaker?.total?.name
        : "-";
    }
  } else {
    return "-";
  }
};

const getRunLine = async (nameKey: any, myArray: any) => {
  for (let i = 0; i < myArray?.length; i++) {
    if (myArray[i].name.split(" ").slice(0, -1).join(" ") == nameKey) {
      return myArray[i];
    }
  }
};

const search = async (nameKey: any, myArray: any) => {
  for (let i = 0; i < myArray?.length; i++) {
    if (myArray[i].id === nameKey) {
      return myArray[i];
    }
  }
  return;
};

const getFinalMatch = async () => {
  try {
    const winlossArray = await getWinLost();
    const getScore = await axiosGet(
      "http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/usa",
      { json: true }
    );
    var getFinalMatch: any = [];
    const takeData = await getScore?.data?.scores?.category?.match.map(
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
              awayTeamErrors: item.awayteam.errors,
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
              homeTeamErrors: item.hometeam.errors,
            },
            time: item.time,
          };
          getFinalMatch.push(upcommingScoreData);
        }
      }
    );
    return await Promise.all(takeData).then(async (item: any) => {
      await socket("mlbFinalMatch", {
        getFinalMatch,
      });
      return getFinalMatch;
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
    const takeData = await getScore?.data?.scores?.category?.match.map(
      async (item: any) => {
        const getAwayTeamImage = await axiosGet(
          `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.awayteam.id}_rosters`,
          { json: true }
        );
        const getHomeTeamImage = await axiosGet(
          `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.hometeam.id}_rosters`,
          { json: true }
        );
        if (
          item.status !== "Not Started" &&
          item.status !== "Final" &&
          item.status !== "Postponed"
        ) {
          const findAwayTeamWinLose: any = await search(
            item?.awayteam?.id,
            winlossArray
          );
          const findHomeTeamWinLose: any = await search(
            item?.hometeam?.id,
            winlossArray
          );
          if (
            item.status !== "Not Started" &&
            item.status !== "Final" &&
            item.status !== "Postponed"
          ) {
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
                awayTeamErrors: item.awayteam.errors,
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
                homeTeamErrors: item.hometeam.errors,
              },
              oddsid: item.oddsid,
              time: item.time,
              timezone: item.timezone,
              out: item.outs,
            };
            getLiveMatch.push(liveScoreData);
          }
          return { getLiveMatch };
        }
      }
    );
    return await Promise.all(takeData).then(async (item: any) => {
      await socket("mlbLiveMatch", {
        getLiveMatch,
      });
      return getLiveMatch;
    });
  } catch (error) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
};

const mlbScoreWithDate = async (params: any) => {
  let day = moment(params.date1).format("DD");
  let month = moment(params.date1).format("MM");
  let year = moment(params.date1).format("YYYY");
  let date = `${day}.${month}.${year}`;
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
                awayTeamErrors: item.awayteam.errors,
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
                homeTeamErrors: item.hometeam.errors,
              },
              time: item.time,
            };
            getFinalMatch.push(finalScoreData);
          }
          return { upcommingScore, getFinalMatch };
        }
      );
    return await Promise.all(takeData).then(async (item: any) => {
      return { upcommingScore, getFinalMatch };
    });
  } catch (error: any) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
};

const createLeague = async (body: any) => {
  const data = new League({
    name: body.name,
    year: body.year,
  });
  const dataToSave = await data.save();
  return dataToSave;
};

const updateLeague = async (param: any, body: any) => {
  const id = param.id;
  const result = await League.findByIdAndUpdate(id, body, {
    returnDocument: "after",
  });
  return result;
};

const deleteLeague = async (param: any) => {
  const id = param.id;
  await League.findByIdAndUpdate(
    id,
    { isDeleted: true },
    {
      returnDocument: "after",
    }
  );
  return { message: `League is deleted successfully` };
};

const getAllLeague = async () => {
  const leagues = await League.find({ isDeleted: false });
  return leagues;
};

const getAllPlayer = async () => {
  const players = await Player.find({ isDeleted: false });
  return players;
};

const deletePlayer = async (param: any) => {
  const id = param.id;
  await Player.findByIdAndUpdate(
    id,
    { isDeleted: true },
    {
      returnDocument: "after",
    }
  );
  return { message: `Player is deleted successfully` };
};

const createPlayer = async (body: any) => {
  const data = new Player(body);
  const dataToSave = await data.save();
  return dataToSave;
};

const updatePlayer = async (param: any, body: any) => {
  const id = param.id;
  const result = await Player.findByIdAndUpdate(id, body, {
    returnDocument: "after",
  });
  return result;
};

const createTeam = async (body: any) => {
  const data = new Team(body);
  const dataToSave = await data.save();
  return dataToSave;
};

const updateTeam = async (param: any, body: any) => {
  const id = param.id;
  const result = await Team.findByIdAndUpdate(id, body, {
    returnDocument: "after",
  });
  return result;
};

const deleteTeam = async (param: any) => {
  const id = param.id;
  await Team.findByIdAndUpdate(
    id,
    { isDeleted: true },
    {
      returnDocument: "after",
    }
  );
  return { message: `Team is deleted successfully` };
};

const getAllTeam = async () => {
  const team = await Team.find({ isDeleted: false }).populate(
    "divisionId leagueId"
  );
  return team;
};

const getAllDivison = async () => {
  const divison = await Division.find({ isDeleted: false });
  return divison;
};

const deleteDivision = async (param: any) => {
  const id = param.id;
  await Division.findByIdAndUpdate(
    id,
    { isDeleted: true },
    {
      returnDocument: "after",
    }
  );
  return { message: `Division is deleted successfully` };
};

const updateDivison = async (param: any, body: any) => {
  const id = param.id;
  const result = await Division.findByIdAndUpdate(id, body, {
    returnDocument: "after",
  });
  return result;
};
const createDivison = async (body: any) => {
  const data = new Division(body);
  const dataToSave = await data.save();
  return dataToSave;
};
const scoreWithCurrentDate = async () => {
  return {
    getLiveMatch: await getLiveMatch(),
    getUpcomingMatch: await getUpcomingMatch(),
    getFinalMatch: await getFinalMatch(),
  };
};
export default {
  getMLBStandings,
  getUpcomingMatch,
  getWinLost,
  search,
  getOdds,
  getRunLine,
  getFinalMatch,
  getLiveMatch,
  mlbScoreWithDate,
  createLeague,
  updateLeague,
  deleteLeague,
  getAllLeague,
  getAllPlayer,
  deletePlayer,
  createPlayer,
  updatePlayer,
  createTeam,
  updateTeam,
  deleteTeam,
  getAllTeam,
  getAllDivison,
  deleteDivision,
  updateDivison,
  createDivison,
  scoreWithCurrentDate,
};
