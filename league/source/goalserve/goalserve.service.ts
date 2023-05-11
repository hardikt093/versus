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
  let day = moment(params.date1).format("D");
  let month = moment(params.date1).format("MM");
  let year = moment(params.date1).format("YYYY");
  let date = `${day}.${month}.${year}`;


  const getFinalMatch = await Match.aggregate([
    {
      '$match': {
        'date': date,
        status: "Final"
      }
    }, {
      '$lookup': {
        'from': 'teams',
        'localField': 'awayTeamId',
        'foreignField': '_id',
        'as': 'awayTeam'
      }
    }, {
      '$lookup': {
        'from': 'teams',
        'localField': 'homeTeamId',
        'foreignField': '_id',
        'as': 'homeTeam'
      }
    }, {
      '$unwind': {
        'path': '$awayTeam',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$unwind': {
        'path': '$homeTeam',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'standings',
        'localField': 'awayTeamId',
        'foreignField': 'teamId',
        'as': 'awayTeamStandings'
      }
    }, {
      '$unwind': {
        'path': '$awayTeamStandings',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'standings',
        'localField': 'homeTeamId',
        'foreignField': 'teamId',
        'as': 'homeTeamStandings'
      }
    }, {
      '$unwind': {
        'path': '$homeTeamStandings',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'teamImages',
        'localField': 'goalServeAwayTeamId',
        'foreignField': 'goalServeTeamId',
        'as': 'awayTeamImage'
      }
    }, {
      '$unwind': {
        'path': '$awayTeamImage',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'teamImages',
        'localField': 'goalServeHomeTeamId',
        'foreignField': 'goalServeTeamId',
        'as': 'homeTeamImage'
      }
    }, {
      '$unwind': {
        'path': '$homeTeamImage',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$project': {
        'id': true,
        'date': true,
        'status': true,
        'datetime_utc': '$dateTimeUtc',
        'time': true,
        'awayTeam': {
          'awayTeamName': '$awayTeam.name',
          'awayTeamId': '$awayTeam._id',
          'awayTeamRun': '$awayTeamTotalScore',
          'awayTeamHit': '$awayTeamHit',
          'awayTeamErrors': '$awayTeamError',
          'won': '$awayTeamStandings.won',
          'lose': '$awayTeamStandings.lost',
          'teamImage': '$awayTeamImage.image'
        },
        'homeTeam': {
          'homeTeamName': '$homeTeam.name',
          'homeTeamId': '$homeTeam._id',
          'homeTeamRun': '$homeTeamTotalScore',
          'homeTeamHit': '$homeTeamHit',
          'homeTeamErrors': '$homeTeamError',
          'won': '$homeTeamStandings.won',
          'lose': '$homeTeamStandings.lost',
          'teamImage': '$homeTeamImage.image'
        }
      }
    }
  ])

  const getUpcommingMatch = await Match.aggregate([
    {
      '$match': {
        'date': date,
        status: "Not Started"
      }
    }, {
      '$lookup': {
        'from': 'teams',
        'localField': 'awayTeamId',
        'foreignField': '_id',
        'as': 'awayTeam'
      }
    }, {
      '$lookup': {
        'from': 'teams',
        'localField': 'homeTeamId',
        'foreignField': '_id',
        'as': 'homeTeam'
      }
    }, {
      '$unwind': {
        'path': '$awayTeam',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$unwind': {
        'path': '$homeTeam',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'standings',
        'localField': 'awayTeamId',
        'foreignField': 'teamId',
        'as': 'awayTeamStandings'
      }
    }, {
      '$unwind': {
        'path': '$awayTeamStandings',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'standings',
        'localField': 'homeTeamId',
        'foreignField': 'teamId',
        'as': 'homeTeamStandings'
      }
    }, {
      '$unwind': {
        'path': '$homeTeamStandings',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'teamImages',
        'localField': 'goalServeAwayTeamId',
        'foreignField': 'goalServeTeamId',
        'as': 'awayTeamImage'
      }
    }, {
      '$unwind': {
        'path': '$awayTeamImage',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'teamImages',
        'localField': 'goalServeHomeTeamId',
        'foreignField': 'goalServeTeamId',
        'as': 'homeTeamImage'
      }
    }, {
      '$unwind': {
        'path': '$homeTeamImage',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$project': {
        'id': true,
        'date': true,
        'status': true,
        'datetime_utc': '$dateTimeUtc',
        'time': true,
        'awayTeam': {
          'awayTeamName': '$awayTeam.name',
          'awayTeamId': '$awayTeam._id',
          'awayTeamRun': '$awayTeamTotalScore',
          'awayTeamHit': '$awayTeamHit',
          'awayTeamErrors': '$awayTeamError',
          'won': '$awayTeamStandings.won',
          'lose': '$awayTeamStandings.lost',
          'teamImage': '$awayTeamImage.image'
        },
        'homeTeam': {
          'homeTeamName': '$homeTeam.name',
          'homeTeamId': '$homeTeam._id',
          'homeTeamRun': '$homeTeamTotalScore',
          'homeTeamHit': '$homeTeamHit',
          'homeTeamErrors': '$homeTeamError',
          'won': '$homeTeamStandings.won',
          'lose': '$homeTeamStandings.lost',
          'teamImage': '$homeTeamImage.image'
        }
      }
    }
  ])
  return { getFinalMatch, getUpcommingMatch }







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
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/${item?.goalServeTeamId}_rosters`,
        { json: true }
      );
      const playerArray1 = roasterApi?.data?.team?.position;
      await Promise.all(
        playerArray1.map(async (val: any) => {
          if (val?.player?.length) {
            await Promise.all(
              val?.player?.map(async (player: any) => {
                const data = {
                  age: player?.age,
                  bats: player?.bats,
                  height: player?.height,
                  goalServePlayerId: player.id,
                  name: player?.name,
                  number: player?.number,
                  position: player?.position,
                  salary: player?.salary,
                  throws: player?.throws,
                  weight: player?.weight,
                };
                const playerData = new Player(data);
                const savedMatchData = await playerData.save();
              })
            );
          } else {
            const data = {
              age: val?.player.age,
              bats: val?.player.bats,
              height: val?.player.height,
              goalServePlayerId: val?.player.id,
              name: val?.player.name,
              number: val?.player.number,
              position: val?.player.position,
              salary: val?.player.salary,
              throws: val?.player.throws,
              weight: val?.player.weight,
            };
            const playerData = new Player(data);
            const savedMatchData = await playerData.save();
          }
        })
      );
    })
  );
  // const dataToSave = await Player.insertMany(body);
  // return dataToSave;
};
const createMatch = async (body: any) => {
  const mlb_shedule = await axiosGet(
    `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_shedule`,
    { json: true }
  );
  // Flatten the array of matches
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
      '$match': {
        'date': '9.05.2023'
      }
    }, {
      '$lookup': {
        'from': 'teams',
        'localField': 'awayTeamId',
        'foreignField': '_id',
        'as': 'awayTeam'
      }
    }, {
      '$lookup': {
        'from': 'teams',
        'localField': 'homeTeamId',
        'foreignField': '_id',
        'as': 'homeTeam'
      }
    }, {
      '$unwind': {
        'path': '$awayTeam',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$unwind': {
        'path': '$homeTeam',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'standings',
        'localField': 'awayTeamId',
        'foreignField': 'teamId',
        'as': 'awayTeamStandings'
      }
    }, {
      '$unwind': {
        'path': '$awayTeamStandings',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'standings',
        'localField': 'homeTeamId',
        'foreignField': 'teamId',
        'as': 'homeTeamStandings'
      }
    }, {
      '$unwind': {
        'path': '$homeTeamStandings',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'teamImages',
        'localField': 'goalServeAwayTeamId',
        'foreignField': 'goalServeTeamId',
        'as': 'awayTeamImage'
      }
    }, {
      '$unwind': {
        'path': '$awayTeamImage',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$lookup': {
        'from': 'teamImages',
        'localField': 'goalServeHomeTeamId',
        'foreignField': 'goalServeTeamId',
        'as': 'homeTeamImage'
      }
    }, {
      '$unwind': {
        'path': '$homeTeamImage',
        'includeArrayIndex': 'string',
        'preserveNullAndEmptyArrays': true
      }
    }, {
      '$project': {
        'id': true,
        'date': true,
        'status': true,
        'datetime_utc': '$dateTimeUtc',
        'time': true,
        'awayTeam': {
          'awayTeamName': '$awayTeam.name',
          'awayTeamId': '$awayTeam._id',
          'awayTeamRun': '$awayTeamTotalScore',
          'awayTeamHit': '$awayTeamHit',
          'awayTeamErrors': '$awayTeamError',
          'won': '$awayTeamStandings.won',
          'lose': '$awayTeamStandings.lost',
          'teamImage': '$awayTeamImage.image'
        },
        'homeTeam': {
          'homeTeamName': '$homeTeam.name',
          'homeTeamId': '$homeTeam._id',
          'homeTeamRun': '$homeTeamTotalScore',
          'homeTeamHit': '$homeTeamHit',
          'homeTeamErrors': '$homeTeamError',
          'won': '$homeTeamStandings.won',
          'lose': '$homeTeamStandings.lost',
          'teamImage': '$homeTeamImage.image'
        }
      }
    }
  ])
};
const scoreWithCurrentDate = async () => {
  return {
    getLiveMatch: await getLiveMatch(),
    getUpcomingMatch: await getUpcomingMatch(),
    getFinalMatch: await getFinalMatch()
    // getFinalMatch: await getFinalMatchDataFromDB(),
  };
};

const addMatch = async (data: any) => {
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

  var daylist = getDaysArray(new Date("2023-02-27"), new Date("2023-05-09"));

  const createMatch = await daylist.map(async (item: any) => {
    const getMatch = await axiosGet(
      `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/usa`,
      { json: true, date: item }
    );
    var savedMatchData: any = "";
    var savediningData: any = "";
    var savedEventData: any = "";
    const matchArray = await getMatch?.data?.scores?.category?.match;
    const league: any = await League.findOne({
      goalServeLeagueId: getMatch?.data.scores.category.id,
    });
    if (matchArray) {
      // for (const item of matchArray) {
      const match = await matchArray.map(async (item: any) => {
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
        savedMatchData = await matchData.save();

        const awayInnings = item?.awayteam?.innings?.inning;
        if (awayInnings) {
          // for (const val of awayInnings) {
          const awayInning = await awayInnings.map(async (val: any) => {
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
            savediningData = await inningDataSaved.save();
          });
        }
        const homeInnings = item?.hometeam?.innings?.inning;
        if (homeInnings) {
          // for (const val of awayInnings) {
          const homeInning = await homeInnings.map(async (val: any) => {
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
            savediningData = await inningDataSaved.save();
          });
        }
        // startingpitchers

        //  starting_pitchersAway
        const starting_pitchersAway =
          item?.starting_pitchers?.awayteam?.player?.id;

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

        const starting_pitchershome =
          item?.starting_pitchers?.hometeam?.player?.id;
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
        // stats
        if (item?.stats) {
          const statsHittersAway = item?.stats?.hitters?.awayteam?.player;
          const statsHittersHome = item?.stats?.hitters?.hometeam?.player;
          const statsPitcherAway = item?.stats?.pitchers?.awayteam?.player;
          const statsPitcherHome = item?.stats?.pitchers?.hometeam?.player;

          if (statsHittersAway.length) {
            statsHittersAway.map(async (hittersAway: any) => {
              const player: any = await Player.findOne({
                goalServePlayerId: hittersAway.id,
              });
              let data = {
                at_bats: hittersAway?.at_bats,
                average: hittersAway?.average,
                cs: hittersAway?.cs,
                doubles: hittersAway?.doubles,
                hit_by_pitch: hittersAway?.hit_by_pitch,
                hits: hittersAway?.hits,
                home_runs: hittersAway?.home_runs,
                // id: hittersAway?."42403",
                playerId: player?._id,
                goalServePlayerId: player?.goalServePlayerId,
                name: hittersAway?.name,
                on_base_percentage: hittersAway?.on_base_percentage,
                pos: hittersAway?.pos,
                runs: hittersAway?.runs,
                runs_batted_in: hittersAway?.runs_batted_in,
                sac_fly: hittersAway?.sac_fly,
                slugging_percentage: hittersAway?.slugging_percentage,
                stolen_bases: hittersAway?.stolen_bases,
                strikeouts: hittersAway?.strikeouts,
                triples: hittersAway?.triples,
                walks: hittersAway?.walks,
                teamType: "awayteam",
                statsType: "hitters",
              };
              const dataSaved = new Stats(data);
              await dataSaved.save();
            });
          } else {
            const player: any = await Player.findOne({
              goalServePlayerId: statsHittersAway.id,
            });
            let data = {
              at_bats: statsHittersAway?.at_bats,
              average: statsHittersAway?.average,
              cs: statsHittersAway?.cs,
              doubles: statsHittersAway?.doubles,
              hit_by_pitch: statsHittersAway?.hit_by_pitch,
              hits: statsHittersAway?.hits,
              home_runs: statsHittersAway?.home_runs,
              // id: statsHittersAway?."42403",
              playerId: player?._id,
              goalServePlayerId: player?.goalServePlayerId,
              name: statsHittersAway?.name,
              on_base_percentage: statsHittersAway?.on_base_percentage,
              pos: statsHittersAway?.pos,
              runs: statsHittersAway?.runs,
              runs_batted_in: statsHittersAway?.runs_batted_in,
              sac_fly: statsHittersAway?.sac_fly,
              slugging_percentage: statsHittersAway?.slugging_percentage,
              stolen_bases: statsHittersAway?.stolen_bases,
              strikeouts: statsHittersAway?.strikeouts,
              triples: statsHittersAway?.triples,
              walks: statsHittersAway?.walks,
              teamType: "awayteam",
              statsType: "hitters",
            };
            const dataSaved = new Stats(data);
            await dataSaved.save();
          }
          if (statsHittersHome.length) {
            statsHittersHome.map(async (hittersHome: any) => {
              const player: any = await Player.findOne({
                goalServePlayerId: hittersHome?.id,
              });
              let data = {
                at_bats: hittersHome?.at_bats,
                average: hittersHome?.average,
                cs: hittersHome?.cs,
                doubles: hittersHome?.doubles,
                hit_by_pitch: hittersHome?.hit_by_pitch,
                hits: hittersHome?.hits,
                home_runs: hittersHome?.home_runs,
                // id: hittersHome."42403",
                playerId: player?._id,
                goalServePlayerId: player?.goalServePlayerId,
                name: hittersHome?.name,
                on_base_percentage: hittersHome?.on_base_percentage,
                pos: hittersHome?.pos,
                runs: hittersHome?.runs,
                runs_batted_in: hittersHome?.runs_batted_in,
                sac_fly: hittersHome?.sac_fly,
                slugging_percentage: hittersHome?.slugging_percentage,
                stolen_bases: hittersHome?.stolen_bases,
                strikeouts: hittersHome?.strikeouts,
                triples: hittersHome?.triples,
                walks: hittersHome?.walks,
                teamType: "hometeam",
                statsType: "hitters",
              };
              const dataSaved = new Stats(data);
              await dataSaved?.save();
            });
          } else {
            const player: any = await Player.findOne({
              goalServePlayerId: statsHittersHome?.id,
            });
            let data = {
              at_bats: statsHittersHome?.at_bats,
              average: statsHittersHome?.average,
              cs: statsHittersHome?.cs,
              doubles: statsHittersHome?.doubles,
              hit_by_pitch: statsHittersHome?.hit_by_pitch,
              hits: statsHittersHome?.hits,
              home_runs: statsHittersHome?.home_runs,
              // id: statsHittersHome."42403",
              playerId: player?._id,
              goalServePlayerId: player?.goalServePlayerId,
              name: statsHittersHome?.name,
              on_base_percentage: statsHittersHome?.on_base_percentage,
              pos: statsHittersHome?.pos,
              runs: statsHittersHome?.runs,
              runs_batted_in: statsHittersHome?.runs_batted_in,
              sac_fly: statsHittersHome?.sac_fly,
              slugging_percentage: statsHittersHome?.slugging_percentage,
              stolen_bases: statsHittersHome?.stolen_bases,
              strikeouts: statsHittersHome?.strikeouts,
              triples: statsHittersHome?.triples,
              walks: statsHittersHome?.walks,
              teamType: "hometeam",
              statsType: "hitters",
            };
            const dataSaved = new Stats(data);
            await dataSaved?.save();
          }

          if (statsPitcherAway.length) {
            statsPitcherAway?.map(async (pitcherAway: any) => {
              const player: any = await Player.findOne({
                goalServePlayerId: pitcherAway?.id,
              });

              let data = {
                earned_runs: pitcherAway?.earned_runs,
                earned_runs_average: pitcherAway?.earned_runs_average,
                hbp: pitcherAway?.hbp,
                hits: pitcherAway?.hits,
                holds: pitcherAway?.holds,
                home_runs: pitcherAway?.home_runs,
                playerId: player?._id,
                goalServePlayerId: player?.goalServePlayerId,
                innings_pitched: pitcherAway?.innings_pitched,
                loss: pitcherAway?.loss,
                name: pitcherAway?.name,
                pc_st: pitcherAway?.pc_st,
                runs: pitcherAway?.runs,
                saves: pitcherAway?.saves,
                strikeouts: pitcherAway?.strikeouts,
                walks: pitcherAway?.walks,
                win: pitcherAway?.win,
                teamType: "awayteam",
                statsType: "pitchers",
              };

              const dataSaved = new Stats(data);
              await dataSaved.save();
            });
          } else {
            const player: any = await Player.findOne({
              goalServePlayerId: statsPitcherAway?.id,
            });

            let data = {
              earned_runs: statsPitcherAway?.earned_runs,
              earned_runs_average: statsPitcherAway?.earned_runs_average,
              hbp: statsPitcherAway?.hbp,
              hits: statsPitcherAway?.hits,
              holds: statsPitcherAway?.holds,
              home_runs: statsPitcherAway?.home_runs,
              playerId: player?._id,
              goalServePlayerId: player?.goalServePlayerId,
              innings_pitched: statsPitcherAway?.innings_pitched,
              loss: statsPitcherAway?.loss,
              name: statsPitcherAway?.name,
              pc_st: statsPitcherAway?.pc_st,
              runs: statsPitcherAway?.runs,
              saves: statsPitcherAway?.saves,
              strikeouts: statsPitcherAway?.strikeouts,
              walks: statsPitcherAway?.walks,
              win: statsPitcherAway?.win,
              teamType: "awayteam",
              statsType: "pitchers",
            };

            const dataSaved = new Stats(data);
            await dataSaved.save();
          }
          if (statsPitcherHome.length) {
            statsPitcherHome.map(async (pitcherHome: any) => {
              const player: any = await Player.findOne({
                goalServePlayerId: pitcherHome?.id,
              });

              let data = {
                earned_runs: pitcherHome?.earned_runs,
                earned_runs_average: pitcherHome?.earned_runs_average,
                hbp: pitcherHome?.hbp,
                hits: pitcherHome?.hits,
                holds: pitcherHome?.holds,
                home_runs: pitcherHome?.home_runs,
                playerId: player?._id,
                goalServePlayerId: player?.goalServePlayerId,
                innings_pitched: pitcherHome?.innings_pitched,
                loss: pitcherHome?.loss,
                name: pitcherHome?.name,
                pc_st: pitcherHome?.pc_st,
                runs: pitcherHome?.runs,
                saves: pitcherHome?.saves,
                strikeouts: pitcherHome?.strikeouts,
                walks: pitcherHome?.walks,
                win: pitcherHome?.win,
                teamType: "awayteam",
                statsType: "pitchers",
              };

              const dataSaved = new Stats(data);
              await dataSaved.save();
            });
          } else {
            const player: any = await Player.findOne({
              goalServePlayerId: statsPitcherHome?.id,
            });

            let data = {
              earned_runs: statsPitcherHome?.earned_runs,
              earned_runs_average: statsPitcherHome?.earned_runs_average,
              hbp: statsPitcherHome?.hbp,
              hits: statsPitcherHome?.hits,
              holds: statsPitcherHome?.holds,
              home_runs: statsPitcherHome?.home_runs,
              playerId: player?._id,
              goalServePlayerId: player?.goalServePlayerId,
              innings_pitched: statsPitcherHome?.innings_pitched,
              loss: statsPitcherHome?.loss,
              name: statsPitcherHome?.name,
              pc_st: statsPitcherHome?.pc_st,
              runs: statsPitcherHome?.runs,
              saves: statsPitcherHome?.saves,
              strikeouts: statsPitcherHome?.strikeouts,
              walks: statsPitcherHome?.walks,
              win: statsPitcherHome?.win,
              teamType: "awayteam",
              statsType: "pitchers",
            };

            const dataSaved = new Stats(data);
            await dataSaved.save();
          }
        }
        if (item?.events) {
          const scoreSummary = item?.events?.event;

          if (scoreSummary?.length) {
            savedEventData = await scoreSummary.map(async (val: any) => {
              const scoreSummaryData = {
                chw: val.chw,
                cle: val.cle,
                desc: val.desc,
                inn: val.inn,
                teamType: val.team,
                matchId: savedMatchData?.id,
                goalServeMatchId: savedMatchData?.goalServeMatchId,
                leagueId: league.id,
                goalServeLeagueId: league.goalServeLeagueId,
              };
              const scoreSummaryDataSaved = new Event(scoreSummaryData);
              return (savedEventData = await scoreSummaryDataSaved.save());
            });
            return savedEventData;
          } else {
            const scoreSummaryData = {
              chw: scoreSummary.chw,
              cle: scoreSummary.cle,
              desc: scoreSummary.desc,
              inn: scoreSummary.inn,
              teamType: scoreSummary.team,
              matchId: savedMatchData?.id,
              goalServeMatchId: savedMatchData?.goalServeMatchId,
              leagueId: league.id,
              goalServeLeagueId: league.goalServeLeagueId,
            };
            const scoreSummaryDataSaved = new Event(scoreSummaryData);
            return (savedEventData = await scoreSummaryDataSaved.save());
          }
        }
      });
    }
  });
  return await Promise.all(createMatch).then(async (item: any) => {
    return item;
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
          goalServePlayerId: teamId?.goalServeTeamId,
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
  addMatch,
  // createMatch,
  createMatchStatsApi,
  addStanding,
};
