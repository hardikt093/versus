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
import Match from "../models/documents/match.model";
import Inning from "../models/documents/inning.model";
import Event from "../models/documents/event.model";
import StartingPitchers from "../models/documents/startingPictures";
import Stats from "../models/documents/stats.model";
import Standings from "../models/documents/standing.model";
import Injury from "../models/documents/injuy.model";
import Odd from "../models/documents/odd.model";
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

                team.pct = +(
                  (Number(team.won) * 100) /
                  (Number(team.won) + Number(team.lost))
                ).toFixed(3);
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
  } catch (error: any) {
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
  if (myArray?.length > 0) {
    for (let i = 0; i < myArray?.length; i++) {
      if (myArray[i].value == nameKey) {
        return myArray[i];
      }
    }
  }
};

const getTotalValues = async (total: any) => {
  if (total?.bookmaker) {
    if (isArray(total?.bookmaker?.total)) {
      return total?.bookmaker?.total[0]?.name
        ? total?.bookmaker?.total[0]?.name
        : "";
    } else {
      return total?.bookmaker?.total?.name ? total?.bookmaker?.total?.name : "";
    }
  } else {
    return "";
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
  let day = moment(params.date1).format("D");
  let month = moment(params.date1).format("MM");
  let year = moment(params.date1).format("YYYY");
  let date = `${day}.${month}.${year}`;

  const getFinalMatch = await Match.aggregate([
    {
      $match: {
        formattedDate: date,
        status: "Final",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "awayTeamId",
        foreignField: "_id",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "homeTeamId",
        foreignField: "_id",
        as: "homeTeam",
      },
    },
    {
      $unwind: {
        path: "$awayTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$homeTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$awayTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$homeTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamImage",
      },
    },
    {
      $unwind: {
        path: "$awayTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamImage",
      },
    },
    {
      $unwind: {
        path: "$homeTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: {
        formattedDate: 1,
        time: 1,
      },
    },
    {
      $project: {
        id: true,
        date: true,
        status: true,
        datetime_utc: "$dateTimeUtc",
        time: true,
        goalServeMatchId: true,
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
        },
      },
    },
  ]);

  const getUpcomingMatch = await Match.aggregate([
    {
      $match: {
        formattedDate: date,
        status: "Not Started",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "awayTeamId",
        foreignField: "_id",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "homeTeamId",
        foreignField: "_id",
        as: "homeTeam",
      },
    },
    {
      $unwind: {
        path: "$awayTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$homeTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$awayTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$homeTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamImage",
      },
    },
    {
      $unwind: {
        path: "$awayTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamImage",
      },
    },
    {
      $unwind: {
        path: "$homeTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: {
        formattedDate: 1,
        time: 1,
      },
    },
    {
      $project: {
        id: true,
        date: true,
        status: true,
        datetime_utc: "$dateTimeUtc",
        time: true,
        goalServeMatchId: true,
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
        },
      },
    },
  ]);
  return { getFinalMatch, getUpcomingMatch };

  // try {
  //   const winlossArray = await getWinLost();
  //   const getScore = await axiosGet(
  //     "http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_shedule",
  //     { json: true, date1: date }
  //   );
  //   var upcommingScore: any = [];
  //   var getFinalMatch: any = [];
  //   const takeData =
  //     await getScore?.data?.fixtures?.category?.matches?.match.map(
  //       async (item: any) => {
  //         const getAwayTeamImage = await axiosGet(
  //           `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.awayteam.id}_rosters`,
  //           { json: true }
  //         );
  //         const getHomeTeamImage = await axiosGet(
  //           `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.hometeam.id}_rosters`,
  //           { json: true }
  //         );
  //         if (item.status === "Not Started") {
  //           const findAwayTeamWinLose: any = await search(
  //             item?.awayteam?.id,
  //             winlossArray
  //           );
  //           const findHomeTeamWinLose: any = await search(
  //             item?.hometeam?.id,
  //             winlossArray
  //           );
  //           let upcommingScoreData = {
  //             status: item.status,
  //             id: item.id,
  //             awayTeam: {
  //               awayTeamName: item.awayteam.name,
  //               awayTeamId: item.awayteam.id,
  //               awayTeamScore: item.awayteam.totalscore,
  //               teamImage: getAwayTeamImage.data.team.image,
  //               won: findAwayTeamWinLose ? findAwayTeamWinLose.won : "",
  //               lose: findAwayTeamWinLose ? findAwayTeamWinLose.lost : "",
  //             },
  //             datetime_utc: item.datetime_utc,
  //             homeTeam: {
  //               homeTeamName: item.hometeam.name,
  //               homeTeamId: item.hometeam.id,
  //               homeTeamScore: item.hometeam.totalscore,
  //               teamImage: getHomeTeamImage.data.team.image,
  //               won: findHomeTeamWinLose ? findHomeTeamWinLose.won : "",
  //               lose: findHomeTeamWinLose ? findHomeTeamWinLose.lost : "",
  //             },
  //             time: item.time,
  //           };
  //           upcommingScore.push(upcommingScoreData);
  //         } else if (item.status === "Final") {
  //           const findAwayTeamWinLose: any = await search(
  //             item?.awayteam?.id,
  //             winlossArray
  //           );
  //           const findHomeTeamWinLose: any = await search(
  //             item?.hometeam?.id,
  //             winlossArray
  //           );
  //           let finalScoreData = {
  //             status: item.status,
  //             id: item.id,
  //             awayTeam: {
  //               awayTeamName: item.awayteam.name,
  //               awayTeamId: item.awayteam.id,
  //               teamImage: getAwayTeamImage.data.team.image,
  //               won: findAwayTeamWinLose ? findAwayTeamWinLose.won : "",
  //               lose: findAwayTeamWinLose ? findAwayTeamWinLose.lost : "",
  //               awayTeamRun: item.awayteam.totalscore,
  //               awayTeamHit: item.awayteam.hits,
  //               awayTeamErrors: item.awayteam.errors,
  //             },
  //             datetime_utc: item.datetime_utc,
  //             homeTeam: {
  //               homeTeamName: item.hometeam.name,
  //               homeTeamId: item.hometeam.id,
  //               teamImage: getHomeTeamImage.data.team.image,
  //               won: findHomeTeamWinLose ? findHomeTeamWinLose.won : "",
  //               lose: findHomeTeamWinLose ? findHomeTeamWinLose.lost : "",
  //               homeTeamRun: item.hometeam.totalscore,
  //               homeTeamHit: item.hometeam.hits,
  //               homeTeamErrors: item.hometeam.errors,
  //             },
  //             time: item.time,
  //           };
  //           getFinalMatch.push(finalScoreData);
  //         }
  //         return { upcommingScore, getFinalMatch };
  //       }
  //     );
  //   return await Promise.all(takeData).then(async (item: any) => {
  //     return { upcommingScore, getFinalMatch };
  //   });
  // } catch (error: any) {
  //   throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  // }
};

const createLeague = async (body: any) => {
  const data = new League({
    name: body.name,
    goalServeLeagueId: body.goalServeLeagueId,
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
  const team = await Team.find({ isDeleted: false });
  await Promise.all(
    team.map(async (item) => {
      const roasterApi = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/1027_rosters`,
        { json: true }
      );
      const statsApi = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/1027_stats`,
        { json: true }
      );

      let allRosterPlayers: any = [];
      let allStatPlayers: any = [];
      let finalArr: any = [];
      roasterApi?.data?.team.position.map((item: any) => {
        if (item.player.length) {
          item.player.map((player: any) => {
            allRosterPlayers.push(player);
          });
        }
      });
      statsApi?.data?.statistic.category.forEach((cat: any) => {
        if (cat.team && cat.team.player.length) {
          cat.team.player.forEach((player: any) => {
            if (cat.name == "Batting") {
              player.type = "batting";
              allStatPlayers.push(player);
            }
            if (cat.name == "Pitching") {
              player.type = "pitching";
              allStatPlayers.push(player);
            }
          });
        } else if (cat.position.length && cat.name == "Fielding") {
          cat.position.forEach((item: any) => {
            item.player.forEach((player: any) => {
              // player.fieldingType = item.name;
              player.type = "fielding";
              allStatPlayers.push(player);
            });
          });
        }
      });
      let uniqueValues = [
        ...new Map(
          allStatPlayers.map((item: any) => [item["id"], item])
        ).values(),
      ];
      uniqueValues.forEach((item: any) => {
        let rosterData = allRosterPlayers.filter(
          (player: any) => player.id == item.id
        );
        if (rosterData.length) {
          let statData = allStatPlayers.filter(
            (player: any) => player.id == rosterData[0].id
          );
          if (statData.length) {
            statData.map((info: any) => {
              if (info.type == "batting") {
                rosterData[0].batting = info;
              }
              if (info.type == "pitching") {
                rosterData[0].pitching = info;
              }
              if (info.type == "fielding") {
                rosterData[0].fielding = info;
              }
            });
            finalArr.push(rosterData[0]);
          }
        } else {
          let statData = allStatPlayers.filter(
            (player: any) => player.id == item.id
          );
          let data: any = {};
          statData.map((info: any) => {
            data = {
              name: statData[0].name,
              id: statData[0].id,
            };
            if (info.type == "batting") {
              data.batting = info;
            }
            if (info.type == "pitching") {
              data.pitching = info;
            }
            if (info.type == "fielding") {
              data.fielding = info;
            }
          });
          finalArr.push(data);
        }
      });

      finalArr.map(async (item: any) => {
        let data = {
          age: item.age,
          bats: item.bats,
          height: item.height,
          goalServePlayerId: item.id,
          name: item.name,
          number: item.number,
          position: item.position,
          salary: item.salary,
          throws: item.throws,
          weight: item.weight,
          pitching: item?.pitching,
          batting: item?.batting,
          fielding: item?.fielding,
        };
        const playerData = new Player(data);
        const savedMatchData = await playerData.save();
      });
    })
  );
};
const createMatch = async (body: any) => {
  var getDaysArray = function (start: any, end: any) {
    for (
      var arr = [], dt = new Date(start);
      dt <= new Date(end);
      dt.setDate(dt.getDate() + 1)
    ) {
      let day = moment(dt).format("DD");
      let month = moment(dt).format("MM");
      let year = moment(dt).format("YYYY");
      let date = `${day}.${month}.${year}`;
      arr.push(date);
    }
    return arr;
  };

  var daylist = getDaysArray(new Date("2023-02-11"), new Date("2023-10-01"));

  const createFutureMatch = await daylist.map(async (item) => {
    const mlb_shedule = await axiosGet(
      `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_shedule`,
      { json: true, date1: item }
    );
    const matches = mlb_shedule?.data?.fixtures?.category?.matches.flatMap(
      (match: any) => match.match
    );
    for (const item of matches) {
      const data: any = {
        date: item.date,
        formattedDate: item.formatted_date,
        timezone: item.timezone,
        seasonType: item.seasonType,
        goalServeMatchId: item.id,
        dateTimeUtc: item.datetime_utc,
        status: item.status,
        time: item.time,
        goalServeVenueId: item.venue_id,
        venueName: item.venue_name,
        homeTeamHit: item.hometeam.hits,
        homeTeamTotalScore: item.hometeam.totalscore,
        homeTeamError: item.hometeam.errors,
        awayTeamHit: item.awayteam.hits,
        awayTeamTotalScore: item.awayteam.totalscore,
        awayTeamError: item.awayteam.errors,
      };
      const teamIdAway: any = await Team.findOne({
        goalServeTeamId: item.awayteam.id,
      });
      if (teamIdAway) {
        data.awayTeamId = teamIdAway.id;
        data.goalServeAwayTeamId = teamIdAway.goalServeTeamId;
      }
      const teamIdHome: any = await Team.findOne({
        goalServeTeamId: item.hometeam.id,
      });
      if (teamIdHome) {
        data.homeTeamId = teamIdHome.id;
        data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
      }
      const matchData = new Match(data);
      const savedMatchData = await matchData.save();
    }
  });

  // Flatten the array of matches
};

const createMatchStatsApi = async (body: any) => {
  const mlb_shedule = await axiosGet(
    `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/usa`,
    { json: true, date: "28.04.2023" }
  );
  const matchArray = mlb_shedule?.data?.scores?.category?.match;
  const league: any = await League.findOne({
    goalServeLeagueId: mlb_shedule?.data.scores.category.id,
  });
  for (const item of matchArray) {
    const data: any = {
      leagueId: league.id,
      goalServeLeagueId: league.goalServeLeagueId,
      outs: item.outs,
      date: item.date,
      formattedDate: item.formatted_date,
      timezone: item.timezone,
      oddsid: item.seasonType,
      attendance: item.attendance,
      goalServeMatchId: item.id,
      dateTimeUtc: item.datetime_utc,
      status: item.status,
      time: item.time,
      goalServeVenueId: item.venue_id,
      venueName: item.venue_name,
      homeTeamHit: item.hometeam.hits,
      homeTeamTotalScore: item.hometeam.totalscore,
      homeTeamError: item.hometeam.errors,
      awayTeamHit: item.awayteam.hits,
      awayTeamTotalScore: item.awayteam.totalscore,
      awayTeamError: item.awayteam.errors,
    };
    const teamIdAway: any = await Team.findOne({
      goalServeTeamId: item.awayteam.id,
    });
    if (teamIdAway) {
      data.awayTeamId = teamIdAway.id;
      data.goalServeAwayTeamId = teamIdAway.goalServeTeamId;
    }
    const teamIdHome: any = await Team.findOne({
      goalServeTeamId: item.hometeam.id,
    });
    if (teamIdHome) {
      data.homeTeamId = teamIdHome.id;
      data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
    }
    const matchData = new Match(data);
    const savedMatchData = await matchData.save();
    const awayInnings = item?.awayteam?.innings?.inning;
    if (awayInnings) {
      for (const val of awayInnings) {
        const inningData = {
          score: val.score,
          number: val.number,
          hits: val.hits,
          leagueId: league.id,
          goalServeLeagueId: league.goalServeLeagueId,
          teamId: teamIdAway.id,
          goalServeTeamId: teamIdAway.goalServeTeamId,
          teamType: "awayteam",
          matchId: savedMatchData?.id,
          goalServeMatchId: savedMatchData?.goalServeMatchId,
        };
        const inningDataSaved = new Inning(inningData);
        const savediningData = await inningDataSaved.save();
      }
    }
    const homeInning = item?.hometeam?.innings?.inning;
    if (homeInning) {
      for (const val of awayInnings) {
        const inningData = {
          score: val.score,
          number: val.number,
          hits: val.hits,
          leagueId: league.id,
          goalServeLeagueId: league.goalServeLeagueId,
          teamId: teamIdHome.id,
          goalServeTeamId: teamIdHome.goalServeTeamId,
          teamType: "hometeam",
          matchId: savedMatchData?.id,
          goalServeMatchId: savedMatchData?.goalServeMatchId,
        };

        const inningDataSaved = new Inning(inningData);
        const savediningData = await inningDataSaved.save();
      }
    }
    const starting_pitchersAway = item?.starting_pitchers?.awayteam?.player?.id;
    if (starting_pitchersAway) {
      const awayTeamPlayer: any = await Player.findOne({
        goalServePlayerId: starting_pitchersAway,
      });
      if (awayTeamPlayer) {
        const starting_pitcherData = {
          playerId: awayTeamPlayer.id,
          goalServePlayerId: awayTeamPlayer.goalServePlayerId,
          matchId: savedMatchData?.id,
          goalServeMatchId: savedMatchData?.goalServeMatchId,
          leagueId: league.id,
          goalServeLeagueId: league.goalServeLeagueId,
          teamId: teamIdAway.id,
          goalServeTeamId: teamIdAway.goalServeTeamId,
          teamType: "awayteam",
        };
        const dataSaved = new StartingPitchers(starting_pitcherData);
        const savedpitcherData = await dataSaved.save();
      }
    }

    const starting_pitchershome = item?.starting_pitchers?.hometeam?.player?.id;
    if (starting_pitchershome) {
      const homeTeamPlayer: any = await Player.findOne({
        goalServePlayerId: starting_pitchershome,
      });
      if (homeTeamPlayer) {
        const starting_pitcherDataHome = {
          playerId: homeTeamPlayer.id,
          goalServePlayerId: homeTeamPlayer.goalServePlayerId,
          matchId: savedMatchData?.id,
          goalServeMatchId: savedMatchData?.goalServeMatchId,
          leagueId: league.id,
          goalServeLeagueId: league.goalServeLeagueId,
          teamId: teamIdHome.id,
          goalServeTeamId: teamIdHome.goalServeTeamId,
          teamType: "hometeam",
        };
        const dataSaved = new StartingPitchers(starting_pitcherDataHome);
        const savedpitcherData = await dataSaved.save();
      }
    }
  }
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

const getFinalMatchDataFromDB = async () => {
  let day = moment().format("D");
  let month = moment().format("MM");
  let year = moment().format("YYYY");
  let date = `${day}.${month}.${year}`;

  return await Match.aggregate([
    {
      $match: {
        formattedDate: date,
        status: "Final",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "awayTeamId",
        foreignField: "_id",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "homeTeamId",
        foreignField: "_id",
        as: "homeTeam",
      },
    },
    {
      $unwind: {
        path: "$awayTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$homeTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$awayTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$homeTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamImage",
      },
    },
    {
      $unwind: {
        path: "$awayTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamImage",
      },
    },
    {
      $unwind: {
        path: "$homeTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        id: true,
        date: true,
        status: true,
        datetime_utc: "$dateTimeUtc",
        time: true,
        goalServeMatchId: true,
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
        },
      },
    },
  ]);
};
const getUpcomingDataFromMongodb = async () => {
  let day = moment().format("D");
  let month = moment().format("MM");
  let year = moment().format("YYYY");
  let date = `${day}.${month}.${year}`;
  return await Match.aggregate([
    {
      $match: {
        formattedDate: date,
        status: "Not Started",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "awayTeamId",
        foreignField: "_id",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "homeTeamId",
        foreignField: "_id",
        as: "homeTeam",
      },
    },
    {
      $unwind: {
        path: "$awayTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$homeTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$awayTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$homeTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamImage",
      },
    },
    {
      $unwind: {
        path: "$awayTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamImage",
      },
    },
    {
      $unwind: {
        path: "$homeTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: {
        formattedDate: 1,
        time: 1,
      },
    },
    {
      $project: {
        id: true,
        date: true,
        status: true,
        datetime_utc: "$dateTimeUtc",
        time: true,
        goalServeMatchId: true,
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
        },
      },
    },
  ]);
};
const getLiveDataFromMongodb = async () => {
  let day = moment().format("D");
  let month = moment().format("MM");
  let year = moment().format("YYYY");
  let date = `${day}.${month}.${year}`;
  return await Match.aggregate([
    // {
    //   $match: {
    //     formattedDate: date,
    //   },
    // },
    {
      $match: {
        $and: [
          {
            status: {
              $ne: "Not Started",
            },
          },
          {
            status: {
              $ne: "Final",
            },
          },
          {
            status: {
              $ne: "Postponed"
            }
          },
          {
            status: {
              $ne: "Canceled"
            }
          }
        ],
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "awayTeamId",
        foreignField: "_id",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "homeTeamId",
        foreignField: "_id",
        as: "homeTeam",
      },
    },
    {
      $unwind: {
        path: "$awayTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$homeTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$awayTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$homeTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamImage",
      },
    },
    {
      $unwind: {
        path: "$awayTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamImage",
      },
    },
    {
      $unwind: {
        path: "$homeTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: {
        datetime_utc: 1,
        // time: 1,
      },
    },
    {
      '$addFields': {
        'inningNo': {
          '$split': [
            '$status', ' '
          ]
        }
      }
    },
    {
      $project: {
        id: true,
        date: true,
        status: true,
        'inningNo': {
          '$last': '$inningNo'
        },
        datetime_utc: "$dateTimeUtc",
        time: true,
        goalServeMatchId: true,
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
        },
      },
    },
  ]);
};
const scoreWithCurrentDate = async () => {
  return {
    // getLiveMatch: await getLiveMatch(),
    getLiveMatch: await getLiveDataFromMongodb(),
    // getUpcomingMatch: await getUpcomingMatch(),
    getUpcomingMatch: await getUpcomingDataFromMongodb(),
    // getFinalMatch: await getFinalMatch(),
    getFinalMatch: await getFinalMatchDataFromDB(),
  };
};

const addAbbrevation = async () => {
  const team = await Team.find({ isDeleted: false });

  team?.map(async (item: any) => {
    const getstanding = await axiosGet(
      `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item.goalServeTeamId}_rosters`,
      {
        json: true,
      }
    );
    const result = await Team.findByIdAndUpdate(
      item.id,
      { abbreviation: getstanding?.data?.team?.abbreviation },
      {
        returnDocument: "after",
      }
    );
  });
};
const addStanding = async () => {
  const getstanding = await axiosGet(
    `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_standings`,
    { json: true }
  );
  const league: any = await League.findOne({
    goalServeLeagueId: getstanding?.data?.standings?.category?.id,
  });
  getstanding?.data?.standings?.category?.league?.map((item: any) => {
    item.division.map((div: any) => {
      div.team.map(async (team: any) => {
        const teamId: any = await Team.findOne({
          goalServeTeamId: team.id,
        });
        let data = {
          leagueId: league?.id,
          leagueType: item?.name,
          goalServeLeagueId: getstanding?.data?.standings?.category?.id,
          division: div?.name,
          away_record: team?.away_record,
          current_streak: team?.away_record,
          games_back: team?.away_record,
          home_record: team.home_record,
          teamId: teamId?.id,
          goalServeTeamId: teamId?.goalServeTeamId,
          pct: +(
            (Number(team.won) * 100) /
            (Number(team.won) + Number(team.lost))
          ).toFixed(3),
          lost: team.lost,
          name: team.name,
          position: team.position,
          runs_allowed: team.runs_allowed,
          runs_diff: team.runs_diff,
          runs_scored: team.runs_scored,
          won: team.won,
        };
        const standingData = new Standings(data);
        await standingData.save();
      });
    });
  });
};

const singleGameBoxScore = async (params: any) => {
  const goalServeMatchId = params.goalServeMatchId;
  const getMatch = await Match.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },

    {
      $lookup: {
        from: "teams",
        localField: "awayTeamId",
        foreignField: "_id",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "homeTeamId",
        foreignField: "_id",
        as: "homeTeam",
      },
    },
    {
      $unwind: {
        path: "$awayTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$homeTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "awayTeamId",
        foreignField: "teamId",
        as: "awayTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$awayTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "homeTeamId",
        foreignField: "teamId",
        as: "homeTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$homeTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamImage",
      },
    },
    {
      $unwind: {
        path: "$awayTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamImage",
      },
    },
    {
      $unwind: {
        path: "$homeTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        id: true,
        attendance: true,
        venueName: true,
        dateTimeUtc: true,
        goalServeMatchId: true,
        awayTeamFullName: "$awayTeam.name",
        homeTeamFullName: "$homeTeam.name",
        awayTeamAbbreviation: "$awayTeam.abbreviation",
        homeTeamAbbreviation: "$homeTeam.abbreviation",
        homeTeamImage: "$homeTeamImage.image",
        awayTeamImage: "$awayTeamImage.image",
        homeTeamTotalScore: true,
        awayTeamTotalScore: true,
        awayTeamInnings: true,
        homeTeamInnings: true,
        event: true,
        stats: {
          awayTeamPitchers: "$awayTeamPitchers",
          homeTeamPitchers: "$homeTeamPitchers",
          homeTeamHitters: "$homeTeamHitters",
          awayTeamHitters: "$awayTeamHitters",
        },

        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          isWinner: {
            $cond: {
              if: { $gte: ["$awayTeamTotalScore", "$homeTeamTotalScore"] },
              then: true,
              else: false,
            },
          },
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          isWinner: {
            $cond: {
              if: { $gte: ["$homeTeamTotalScore", "$awayTeamTotalScore"] },
              then: true,
              else: false,
            },
          },
        },

        pitchingResult: {
          win: {
            $cond: {
              if: {
                $ne: [
                  {
                    $filter: {
                      input: "$awayTeamPitchers",
                      as: "pitcher",
                      cond: { $ne: ["$$pitcher.win", ""] },
                    },
                  },
                  [],
                ],
              },
              then: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$awayTeamPitchers",
                      as: "pitcher",
                      cond: { $ne: ["$$pitcher.win", ""] },
                    },
                  },
                  0,
                ],
              },
              else: {
                $cond: {
                  if: {
                    $ne: [
                      {
                        $filter: {
                          input: "$homeTeamPitchers",
                          as: "pitcher",
                          cond: { $ne: ["$$pitcher.win", ""] },
                        },
                      },
                      [],
                    ],
                  },
                  then: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$homeTeamPitchers",
                          as: "pitcher",
                          cond: { $ne: ["$$pitcher.win", ""] },
                        },
                      },
                      0,
                    ],
                  },
                  else: null,
                },
              },
            },
          },
          loss: {
            $cond: {
              if: {
                $ne: [
                  {
                    $filter: {
                      input: "$awayTeamPitchers",
                      as: "pitcher",
                      cond: { $ne: ["$$pitcher.loss", ""] },
                    },
                  },
                  [],
                ],
              },
              then: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$awayTeamPitchers",
                      as: "pitcher",
                      cond: { $ne: ["$$pitcher.loss", ""] },
                    },
                  },
                  0,
                ],
              },
              else: {
                $cond: {
                  if: {
                    $ne: [
                      {
                        $filter: {
                          input: "$homeTeamPitchers",
                          as: "pitcher",
                          cond: { $ne: ["$$pitcher.loss", ""] },
                        },
                      },
                      [],
                    ],
                  },
                  then: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$homeTeamPitchers",
                          as: "pitcher",
                          cond: { $ne: ["$$pitcher.loss", ""] },
                        },
                      },
                      0,
                    ],
                  },
                  else: null,
                },
              },
            },
          },
          saves: {
            $cond: {
              if: {
                $ne: [
                  {
                    $filter: {
                      input: "$awayTeamPitchers",
                      as: "pitcher",
                      cond: { $ne: ["$$pitcher.saves", ""] },
                    },
                  },
                  [],
                ],
              },
              then: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$awayTeamPitchers",
                      as: "pitcher",
                      cond: { $ne: ["$$pitcher.saves", ""] },
                    },
                  },
                  0,
                ],
              },
              else: {
                $cond: {
                  if: {
                    $ne: [
                      {
                        $filter: {
                          input: "$homeTeamPitchers",
                          as: "pitcher",
                          cond: { $ne: ["$$pitcher.saves", ""] },
                        },
                      },
                      [],
                    ],
                  },
                  then: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$homeTeamPitchers",
                          as: "pitcher",
                          cond: { $ne: ["$$pitcher.saves", ""] },
                        },
                      },
                      0,
                    ],
                  },
                  else: null,
                },
              },
            },
          },
        },
      },
    },
  ]);
  return { getMatch: getMatch[0] };
};

const oldSingleGameBoxScore = async (params: any) => {
  const goalServeMatchId = params.goalServeMatchId;
  const getMatch = await Match.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },

    {
      $lookup: {
        from: "teams",
        localField: "awayTeamId",
        foreignField: "_id",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "homeTeamId",
        foreignField: "_id",
        as: "homeTeam",
      },
    },
    {
      $unwind: {
        path: "$awayTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$homeTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "awayTeamId",
        foreignField: "teamId",
        as: "awayTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$awayTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "standings",
        localField: "homeTeamId",
        foreignField: "teamId",
        as: "homeTeamStandings",
      },
    },
    {
      $unwind: {
        path: "$homeTeamStandings",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamImage",
      },
    },
    {
      $unwind: {
        path: "$awayTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamImage",
      },
    },
    {
      $unwind: {
        path: "$homeTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "innings",
        let: {
          goalServeMatchId: "$goalServeMatchId",
          goalServeTeamId: "$goalServeAwayTeamId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$$goalServeMatchId", "$goalServeMatchId"] },
                  { $eq: ["$$goalServeTeamId", "$goalServeTeamId"] },
                ],
              },
            },
          },
        ],
        as: "inningsAway",
      },
    },
    {
      $lookup: {
        from: "innings",
        let: {
          goalServeMatchId: "$goalServeMatchId",
          goalServeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$$goalServeMatchId", "$goalServeMatchId"] },
                  { $eq: ["$$goalServeTeamId", "$goalServeTeamId"] },
                ],
              },
            },
          },
        ],
        as: "inningsHome",
      },
    },

    {
      $lookup: {
        from: "events",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "matchEvents",
      },
    },
    {
      $lookup: {
        from: "stats",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "matchStats",
      },
    },
    {
      $project: {
        id: true,
        attendance: true,
        venueName: true,
        dateTimeUtc: true,
        goalServeMatchId: true,
        awayTeamFullName: "$awayTeam.name",
        homeTeamFullName: "$homeTeam.name",
        awayTeamAbbreviation: "$awayTeam.abbreviation",
        homeTeamAbbreviation: "$homeTeam.abbreviation",
        homeTeamTotalScore: true,
        awayTeamTotalScore: true,
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
        },

        // awayInning: {
        //   $map: {
        //     input: "$awayInning",
        //     as: "m",
        //     in: {
        //       hits: "$$m.hits",
        //       number: "$$m.number",
        //     },
        //   },
        // },
        awayInning: "$inningsAway",
        homeInning: "$inningsHome",
        matchEvents: "$matchEvents",
        matchStats: "$matchStats",
      },
    },
  ]);
  return { getMatch };
};

const addMatchDataFuture = async (data: any) => {
  var getDaysArray = function (start: any, end: any) {
    for (
      var arr = [], dt = new Date(start);
      dt <= new Date(end);
      dt.setDate(dt.getDate() + 1)
    ) {
      let day = moment(dt).format("DD");
      let month = moment(dt).format("MM");
      let year = moment(dt).format("YYYY");
      let date = `${day}.${month}.${year}`;
      arr.push(date);
    }
    return arr;
  };

  var daylist = getDaysArray(new Date("2023-02-28"), new Date("2023-03-02"));

  for (let i = 0; i < daylist?.length; i++) {
    const mlb_shedule = await axiosGet(
      `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_shedule`,
      { json: true, date1: daylist[i] }
    );

    const matchArray = await mlb_shedule?.data?.fixtures?.category?.matches
      ?.match;
    if (matchArray?.length > 0) {
      const league: any = await League.findOne({
        goalServeLeagueId: mlb_shedule?.data.fixtures?.category?.id,
      });
      var savedMatchData: any = "";
      for (let j = 0; j < matchArray?.length; j++) {
        const data: any = {
          leagueId: league.id,
          goalServeLeagueId: league.goalServeLeagueId,
          outs: matchArray[j].outs,
          date: matchArray[j].date,
          formattedDate: matchArray[j].formatted_date,
          timezone: matchArray[j].timezone,
          oddsid: matchArray[j].seasonType,
          attendance: matchArray[j].attendance,
          goalServeMatchId: matchArray[j].id,
          dateTimeUtc: matchArray[j].datetime_utc,
          status: matchArray[j].status,
          time: matchArray[j].time,
          goalServeVenueId: matchArray[j].venue_id,
          venueName: matchArray[j].venue_name,
          homeTeamHit: matchArray[j].hometeam.hits,
          homeTeamTotalScore: matchArray[j].hometeam.totalscore,
          homeTeamError: matchArray[j].hometeam.errors,
          awayTeamHit: matchArray[j].awayteam.hits,
          awayTeamTotalScore: matchArray[j].awayteam.totalscore,
          awayTeamError: matchArray[j].awayteam.errors,
          // new entries
          awayTeamInnings: matchArray[j].awayteam?.innings?.inning
            ? matchArray[j].awayteam?.innings?.inning
            : [],
          homeTeamInnings: matchArray[j].hometeam?.innings?.inning
            ? matchArray[j].hometeam?.innings?.inning
            : [],
          event: matchArray[j].events?.event ? matchArray[j].events?.event : [],
          startingPitchers: matchArray[j].starting_pitchers,
          awayTeamHitters: matchArray[j].stats?.hitters?.awayteam?.player
            ? matchArray[j].stats?.hitters?.awayteam?.player
            : [],
          homeTeamHitters: matchArray[j].stats?.hitters?.hometeam?.player
            ? matchArray[j].stats?.hitters?.hometeam?.player
            : [],
          awayTeamPitchers: matchArray[j].stats?.pitchers?.awayteam?.player
            ? matchArray[j].stats?.pitchers?.awayteam?.player
            : [],
          homeTeamPitchers: matchArray[j].stats?.pitchers?.hometeam?.player
            ? matchArray[j].stats?.pitchers?.hometeam?.player
            : [],
        };

        const teamIdAway: any = await Team.findOne({
          goalServeTeamId: matchArray[j].awayteam.id,
        });
        if (teamIdAway) {
          data.awayTeamId = teamIdAway.id;
          data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
            ? teamIdAway?.goalServeTeamId
            : "";
        }
        const teamIdHome: any = await Team.findOne({
          goalServeTeamId: matchArray[j].hometeam.id,
        });
        if (teamIdHome) {
          data.homeTeamId = teamIdHome.id;
          data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
        }
        const matchData = new Match(data);
        savedMatchData = await matchData.save();
      }
    }
  }
};

const getStandingData = async () => {
  const getStandingData = await Standings.aggregate([
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeTeamId",
        foreignField: "goalServeTeamId",
        as: "images",
      },
    },
    {
      $unwind: {
        path: "$images",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: { leagueType: "$leagueType", division: "$division" },
        teams: {
          $push: {
            away_record: "$away_record",
            current_streak: "$current_streak",
            games_back: "$games_back",
            home_record: "$home_record",
            id: { $toString: "$goalServeTeamId" },
            lost: "$lost",
            name: "$name",
            position: "$position",
            runs_allowed: "$runs_allowed",
            runs_diff: "$runs_diff",
            runs_scored: "$runs_scored",
            won: "$won",
            teamImage: "$images",
            pct: "$pct",
          },
        },
      },
    },

    {
      $group: {
        _id: "$_id.leagueType",
        divisions: {
          $push: {
            name: "$_id.division",
            teams: "$teams",
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        data: {
          $push: {
            k: {
              $cond: [
                { $eq: ["$_id", "National League"] },
                "nationalLeague",
                "americanLeague",
              ],
            },
            v: "$divisions",
          },
        },
      },
    },
    {
      $replaceRoot: {
        newRoot: {
          $arrayToObject: "$data",
        },
      },
    },
  ]);

  return getStandingData[0];
};
const addMatchWithNewModel = async () => {
  var getDaysArray = function (start: any, end: any) {
    for (
      var arr = [], dt = new Date(start);
      dt <= new Date(end);
      dt.setDate(dt.getDate() + 1)
    ) {
      let day = moment(dt).format("DD");
      let month = moment(dt).format("MM");
      let year = moment(dt).format("YYYY");
      let date = `${day}.${month}.${year}`;
      arr.push(date);
    }
    return arr;
  };

  var daylist = getDaysArray(new Date("2023-02-28"), new Date("2023-05-10"));
  for (let i = 0; i < daylist?.length; i++) {
    const getMatch = await axiosGet(
      `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/usa`,
      { json: true, date: daylist[i] }
    );
    const matchArray = await getMatch?.data?.scores?.category?.match;
    if (matchArray?.length > 0) {
      const league: any = await League.findOne({
        goalServeLeagueId: getMatch?.data.scores.category.id,
      });
      var savedMatchData: any = "";
      for (let j = 0; j < matchArray?.length; j++) {
        const data: any = {
          leagueId: league.id,
          goalServeLeagueId: league.goalServeLeagueId,
          outs: matchArray[j].outs,
          date: matchArray[j].date,
          formattedDate: matchArray[j].formatted_date,
          timezone: matchArray[j].timezone,
          oddsid: matchArray[j].seasonType,
          attendance: matchArray[j].attendance,
          goalServeMatchId: matchArray[j].id,
          dateTimeUtc: matchArray[j].datetime_utc,
          status: matchArray[j].status,
          time: matchArray[j].time,
          goalServeVenueId: matchArray[j].venue_id,
          venueName: matchArray[j].venue_name,
          homeTeamHit: matchArray[j].hometeam.hits,
          homeTeamTotalScore: matchArray[j].hometeam.totalscore,
          homeTeamError: matchArray[j].hometeam.errors,
          awayTeamHit: matchArray[j].awayteam.hits,
          awayTeamTotalScore: matchArray[j].awayteam.totalscore,
          awayTeamError: matchArray[j].awayteam.errors,
          // new entries
          awayTeamInnings: matchArray[j].awayteam?.innings?.inning
            ? matchArray[j].awayteam?.innings?.inning
            : [],
          homeTeamInnings: matchArray[j].hometeam?.innings?.inning
            ? matchArray[j].hometeam?.innings?.inning
            : [],
          event: matchArray[j].events?.event ? matchArray[j].events?.event : [],
          startingPitchers: matchArray[j].starting_pitchers,
          awayTeamHitters: matchArray[j].stats?.hitters?.awayteam?.player
            ? matchArray[j].stats?.hitters?.awayteam?.player
            : [],
          homeTeamHitters: matchArray[j].stats?.hitters?.hometeam?.player
            ? matchArray[j].stats?.hitters?.hometeam?.player
            : [],
          awayTeamPitchers: matchArray[j].stats?.pitchers?.awayteam?.player
            ? matchArray[j].stats?.pitchers?.awayteam?.player
            : [],
          homeTeamPitchers: matchArray[j].stats?.pitchers?.hometeam?.player
            ? matchArray[j].stats?.pitchers?.hometeam?.player
            : [],
        };

        const teamIdAway: any = await Team.findOne({
          goalServeTeamId: matchArray[j].awayteam.id,
        });
        if (teamIdAway) {
          data.awayTeamId = teamIdAway.id;
          data.goalServeAwayTeamId = teamIdAway.goalServeTeamId;
        }
        const teamIdHome: any = await Team.findOne({
          goalServeTeamId: matchArray[j].hometeam.id,
        });
        if (teamIdHome) {
          data.homeTeamId = teamIdHome.id;
          data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
        }
        const matchData = new Match(data);
        savedMatchData = await matchData.save();
      }
    }
  }
};
const addInjuryReport = async () => {
  const team = await Team.find({ isDeleted: false });
  await Promise.all(
    team.map(async (item) => {
      const injuryApi = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item?.goalServeTeamId}_injuries`,
        { json: true }
      );
      const injuryArray1 = injuryApi?.data?.team;
      if (injuryArray1?.report?.length) {
        await Promise.all(
          injuryArray1.report.map(async (val: any) => {
            const player = await Player.findOne({
              goalServePlayerId: val.player_id,
            });
            console.log("player", player,  val.player_id);
            const data = {
              date: val?.date,
              description: val.description,
              goalServePlayerId: val.player_id,
              playerName: val.player_name,
              playerId: player?.id,
              status: val.status,
              goalServeTeamId: injuryApi?.data?.team?.id,
              teamId: item.id,
            };
            const playerData = new Injury(data);
            const saveInjuries = await playerData.save();
          })
        );
      } else {
        const val = injuryArray1?.report;

        const player = await Player.findOne({
          goalServePlayerId: val.player_id,
        });

        const data = {
          date: val?.date,
          description: val?.description,
          goalServePlayerId: val?.player_id,
          playerName: val?.player_name,
          status: val?.status,
          goalServeTeamId: injuryArray1?.id,
          teamId: item.id,
          playerId: player?.id,
        };
        const playerData = new Injury(data);
        const saveInjuries = await playerData.save();
      }
    })
  );
};
const singleGameBoxScoreUpcomming = async (params: any) => {
  const goalServeMatchId = params.goalServeMatchId;
  const getMatch = await Match.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },

    {
      $lookup: {
        from: "teams",
        localField: "awayTeamId",
        foreignField: "_id",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "homeTeamId",
        foreignField: "_id",
        as: "homeTeam",
      },
    },
    {
      $unwind: {
        path: "$awayTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: "$homeTeam",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamImage",
      },
    },
    {
      $unwind: {
        path: "$awayTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "teamImages",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamImage",
      },
    },
    {
      $unwind: {
        path: "$homeTeamImage",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "injuries",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamInjuredPlayers",
      },
    },
    {
      $unwind: {
        path: "$homeTeamInjuredPlayers",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "injuries",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamInjuredPlayers",
      },
    },
    {
      $unwind: {
        path: "$awayTeamInjuredPlayers",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        id: true,
        attendance: true,
        venueName: true,
        dateTimeUtc: true,
        goalServeMatchId: true,
        startingPitchers: true,
        awayTeamFullName: "$awayTeam.name",
        homeTeamFullName: "$homeTeam.name",
        awayTeamAbbreviation: "$awayTeam.abbreviation",
        homeTeamAbbreviation: "$homeTeam.abbreviation",
        homeTeamImage: "$homeTeamImage.image",
        awayTeamImage: "$awayTeamImage.image",
        awayTeamInjuredPlayers: {
          date: "$awayTeamInjuredPlayers.date",
          description: "$awayTeamInjuredPlayers.description",
          playerId: "$awayTeamInjuredPlayers.playerId",
          goalServePlayerId: "$awayTeamInjuredPlayers.goalServePlayerId",
          playerName: "$awayTeamInjuredPlayers.playerName",
          status: "$awayTeamInjuredPlayers.status",
        },
        homeTeamInjuredPlayers: {
          date: "$homeTeamInjuredPlayers.date",
          description: "$homeTeamInjuredPlayers.description",
          playerId: "$homeTeamInjuredPlayers.playerId",
          goalServePlayerId: "$homeTeamInjuredPlayers.goalServePlayerId",
          playerName: "$homeTeamInjuredPlayers.playerName",
          status: "$homeTeamInjuredPlayers.status",
        },
      },
    },
  ]);
  return { getMatch: getMatch[0] };
};

const createAndUpdateOdds = async () => {
  let day = moment().format("D");
  let month = moment().format("MM");
  let year = moment().format("YYYY");
  let date = `${day}.${month}.${year}`;
  try {
    const getScore = await axiosGet(
      "http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_shedule",
      { json: true, date1: date, showodds: "1", bm: "455," }
    );
    var matchData = getScore?.data?.fixtures?.category?.matches?.match
    // console.log("matchData", matchData)
    if (matchData?.length > 0) {
      const takeData = await matchData?.map(async (item: any) => {
        if (item.status === "Not Started") {
          const league: any = await League.findOne({
            goalServeLeagueId: getScore?.data.fixtures?.category?.id,
          });
          const findMatchOdds = await Odd.find({ goalServerMatchId: item?.id })
          if (findMatchOdds?.length == 0) {
            // getMoneyLine
            const getMoneyLine: any = await getOdds(
              "Home/Away",
              item?.odds?.type
            );
            const awayTeamMoneyline = getMoneyLine
              ? getMoneyLine?.bookmaker?.odd?.find(
                (item: any) => item?.name === "2"
              )
              : {}
            const homeTeamMoneyline = getMoneyLine
              ? getMoneyLine?.bookmaker?.odd?.find(
                (item: any) => item?.name === "1"
              )
              : {}
            // getSpread
            const getSpread = await getOdds("Run Line", item?.odds?.type);
            const getAwayTeamRunLine = await getRunLine(
              item?.awayteam?.name,
              getSpread?.bookmaker?.odd
            );
            const getHomeTeamRunLine = await getRunLine(
              item?.hometeam?.name,
              getSpread?.bookmaker?.odd
            );
            const awayTeamSpread = getAwayTeamRunLine
              ? getAwayTeamRunLine?.name?.split(" ").slice(-1)[0]
              : "null"

            const homeTeamSpread = getHomeTeamRunLine
              ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
              : "null"
            console.log("homeTeamSpread", homeTeamSpread)
            const total = await getTotal("Over/Under", item?.odds?.type);
            const totalValues = await getTotalValues(total);
            let data = {
              goalServerLeagueId: league.goalServeLeagueId,
              goalServerMatchId: item?.id,
              goalServerHomeTeamId: item?.hometeam?.id,
              goalServeAwayTeamId: item?.awayteam?.id,
              homeTeamSpread: homeTeamSpread,
              homeTeamTotal: totalValues,
              awayTeamSpread: awayTeamSpread,
              awayTeamTotal: totalValues,
              awayTeamMoneyline: awayTeamMoneyline,
              homeTeamMoneyline: homeTeamMoneyline

            }
            const oddsData = new Odd(data);
            const savedOddsData = await oddsData.save();
            console.log("savedOddsData", savedOddsData)
          }
          else {
            // getMoneyLine
            const getMoneyLine: any = await getOdds(
              "Home/Away",
              item?.odds?.type
            );
            const awayTeamMoneyline = getMoneyLine
              ? getMoneyLine?.bookmaker?.odd?.find(
                (item: any) => item?.name === "2"
              )
              : {}
            const homeTeamMoneyline = getMoneyLine
              ? getMoneyLine?.bookmaker?.odd?.find(
                (item: any) => item?.name === "1"
              )
              : {}
            // getSpread
            const getSpread = await getOdds("Run Line", item?.odds?.type);
            const getAwayTeamRunLine = await getRunLine(
              item?.awayteam?.name,
              getSpread?.bookmaker?.odd
            );
            const getHomeTeamRunLine = await getRunLine(
              item?.hometeam?.name,
              getSpread?.bookmaker?.odd
            );
            const awayTeamSpread = getAwayTeamRunLine
              ? getAwayTeamRunLine?.name?.split(" ").slice(-1)[0]
              : "null"

            const homeTeamSpread = getHomeTeamRunLine
              ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
              : "null"
            console.log("homeTeamSpread", homeTeamSpread)
            const total = await getTotal("Over/Under", item?.odds?.type);
            const totalValues = await getTotalValues(total);
            let data = {
              goalServerLeagueId: league.goalServeLeagueId,
              goalServerMatchId: item?.id,
              goalServerHomeTeamId: item?.hometeam?.id,
              goalServeAwayTeamId: item?.awayteam?.id,
              homeTeamSpread: homeTeamSpread,
              homeTeamTotal: totalValues,
              awayTeamSpread: awayTeamSpread,
              awayTeamTotal: totalValues,
              awayTeamMoneyline: awayTeamMoneyline,
              homeTeamMoneyline: homeTeamMoneyline

            }
            // const oddsData = new Odd(data);
            // const savedOddsData = await oddsData.save();
            // console.log("savedOddsData", savedOddsData)
            const updateOdds = await Odd.findOneAndUpdate({ goalServerMatchId: item?.id }, { $set: data }, { new: true })
          }
        }
      })
    }
  } catch (error: any) {
    console.log("error", error)
  }
}

const updateCurruntDateRecord = async () => {
  try {
    const getMatch = await axiosGet(
      `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/usa`,
      { json: true }
    );
    const matchArray = await getMatch?.data?.scores?.category?.match;
    if (matchArray?.length > 0) {
      for (let j = 0; j < matchArray?.length; j++) {

        // const findMatch = await Match.find({ goalServeMatchId: matchArray[j].id })
        const league: any = await League.findOne({
          goalServeLeagueId: getMatch?.data.scores.category.id,
        });
        if (matchArray[j].status != "Not Started" && matchArray[j].status != "Final") {
          // if (matchArray[j].status == "Final") {
          const data: any = {
            leagueId: league.id,
            goalServeLeagueId: league.goalServeLeagueId,
            outs: matchArray[j].outs,
            date: matchArray[j].date,
            formattedDate: matchArray[j].formatted_date,
            timezone: matchArray[j].timezone,
            oddsid: matchArray[j].seasonType,
            attendance: matchArray[j].attendance,
            goalServeMatchId: matchArray[j].id,
            dateTimeUtc: matchArray[j].datetime_utc,
            status: matchArray[j].status,
            time: matchArray[j].time,
            goalServeVenueId: matchArray[j].venue_id,
            venueName: matchArray[j].venue_name,
            homeTeamHit: matchArray[j].hometeam.hits,
            homeTeamTotalScore: matchArray[j].hometeam.totalscore,
            homeTeamError: matchArray[j].hometeam.errors,
            awayTeamHit: matchArray[j].awayteam.hits,
            awayTeamTotalScore: matchArray[j].awayteam.totalscore,
            awayTeamError: matchArray[j].awayteam.errors,
            // new entries
            awayTeamInnings: matchArray[j].awayteam?.innings?.inning
              ? matchArray[j].awayteam?.innings?.inning
              : [],
            homeTeamInnings: matchArray[j].hometeam?.innings?.inning
              ? matchArray[j].hometeam?.innings?.inning
              : [],
            event: matchArray[j].events?.event ? matchArray[j].events?.event : [],
            startingPitchers: matchArray[j].starting_pitchers,
            awayTeamHitters: matchArray[j].stats?.hitters?.awayteam?.player
              ? matchArray[j].stats?.hitters?.awayteam?.player
              : [],
            homeTeamHitters: matchArray[j].stats?.hitters?.hometeam?.player
              ? matchArray[j].stats?.hitters?.hometeam?.player
              : [],
            awayTeamPitchers: matchArray[j].stats?.pitchers?.awayteam?.player
              ? matchArray[j].stats?.pitchers?.awayteam?.player
              : [],
            homeTeamPitchers: matchArray[j].stats?.pitchers?.hometeam?.player
              ? matchArray[j].stats?.pitchers?.hometeam?.player
              : [],
          };
          const teamIdAway: any = await Team.findOne({
            goalServeTeamId: matchArray[j].awayteam.id,
          });
          if (teamIdAway) {
            data.awayTeamId = teamIdAway.id;
            data.goalServeAwayTeamId = teamIdAway.goalServeTeamId;
          }
          const teamIdHome: any = await Team.findOne({
            goalServeTeamId: matchArray[j].hometeam.id,
          });
          if (teamIdHome) {
            data.homeTeamId = teamIdHome.id;
            data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
          }
          const recordUpdate = await Match.findOneAndUpdate({ goalServeMatchId: data.goalServeMatchId }, { $set: data }, { new: true })
        }
        else {
          const data: any = {
            leagueId: league.id,
            goalServeLeagueId: league.goalServeLeagueId,
            outs: matchArray[j].outs,
            date: matchArray[j].date,
            formattedDate: matchArray[j].formatted_date,
            timezone: matchArray[j].timezone,
            oddsid: matchArray[j].seasonType,
            attendance: matchArray[j].attendance,
            goalServeMatchId: matchArray[j].id,
            dateTimeUtc: matchArray[j].datetime_utc,
            status: matchArray[j].status,
            time: matchArray[j].time,
            goalServeVenueId: matchArray[j].venue_id,
            venueName: matchArray[j].venue_name,
            homeTeamHit: matchArray[j].hometeam.hits,
            homeTeamTotalScore: matchArray[j].hometeam.totalscore,
            homeTeamError: matchArray[j].hometeam.errors,
            awayTeamHit: matchArray[j].awayteam.hits,
            awayTeamTotalScore: matchArray[j].awayteam.totalscore,
            awayTeamError: matchArray[j].awayteam.errors,
            // new entries
            awayTeamInnings: matchArray[j].awayteam?.innings?.inning
              ? matchArray[j].awayteam?.innings?.inning
              : [],
            homeTeamInnings: matchArray[j].hometeam?.innings?.inning
              ? matchArray[j].hometeam?.innings?.inning
              : [],
            event: matchArray[j].events?.event ? matchArray[j].events?.event : [],
            startingPitchers: matchArray[j].starting_pitchers,
            awayTeamHitters: matchArray[j].stats?.hitters?.awayteam?.player
              ? matchArray[j].stats?.hitters?.awayteam?.player
              : [],
            homeTeamHitters: matchArray[j].stats?.hitters?.hometeam?.player
              ? matchArray[j].stats?.hitters?.hometeam?.player
              : [],
            awayTeamPitchers: matchArray[j].stats?.pitchers?.awayteam?.player
              ? matchArray[j].stats?.pitchers?.awayteam?.player
              : [],
            homeTeamPitchers: matchArray[j].stats?.pitchers?.hometeam?.player
              ? matchArray[j].stats?.pitchers?.hometeam?.player
              : [],
          };
          const teamIdAway: any = await Team.findOne({
            goalServeTeamId: matchArray[j].awayteam.id,
          });
          if (teamIdAway) {
            data.awayTeamId = teamIdAway.id;
            data.goalServeAwayTeamId = teamIdAway.goalServeTeamId;
          }
          const teamIdHome: any = await Team.findOne({
            goalServeTeamId: matchArray[j].hometeam.id,
          });
          if (teamIdHome) {
            data.homeTeamId = teamIdHome.id;
            data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
          }
          const recordUpdate = await Match.findOneAndUpdate({ goalServeMatchId: data.goalServeMatchId }, { $set: data }, { new: true })
        }
      }
    }
  } catch (error: any) {
    console.log("error", error)
  }


}
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
  createMatch,
  createMatchStatsApi,
  addStanding,
  addAbbrevation,
  singleGameBoxScore,
  addMatchDataFuture,
  getStandingData,
  addMatchWithNewModel,
  singleGameBoxScoreUpcomming,
  addInjuryReport,
  createAndUpdateOdds,
  updateCurruntDateRecord
};
