import httpStatus from "http-status";
import { IDivision, ITeam } from "../../interfaces/input";
import { goalserveApi } from "../../services/goalserve.service";
import betServices from "../../bet/bet.service";
import socket from "../../services/socket.service";
import AppError from "../../utils/AppError";
import League from "../../models/documents/league.model";
import moment from "moment";
import Player from "../../models/documents/MLB/player.model";
import Team from "../../models/documents/MLB/team.model";
import { isArray } from "lodash";
import Match from "../../models/documents/MLB/match.model";
import Bet from "../../models/documents/bet.model";
import Standings from "../../models/documents/MLB/standing.model";
import Injury from "../../models/documents/MLB/injuy.model";
import Odd from "../../models/documents/MLB/odd.model";
import StatsPlayer from "../../models/documents/MLB/statsPlayer.model";
import StatsTeam from "../../models/documents/MLB/teamStats.model";
import ITeamModel from "../../models/interfaces/team.interface";
import IMatchModel from "../../models/interfaces/match.interface";
import ILeagueModel from "../../models/interfaces/league.interface";
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
  try {
    let curruntDay = moment().startOf("day").utc().toISOString();
    let subtractOneDay = moment(curruntDay)
      .subtract(12, "hours")
      .utc()
      .toISOString();
    let addOneDay = moment(curruntDay).add(38, "hours").utc().toISOString();

    const getUpcomingMatch = await Match.aggregate([
      {
        $addFields: {
          spliteTime: {
            $split: ["$dateTimeUtc", " "],
          },
        },
      },
      {
        $addFields: {
          dateutc: {
            $toDate: "$dateTimeUtc",
          },
        },
      },
      {
        $addFields: {
          dateInString: {
            $toString: "$dateutc",
          },
        },
      },
      {
        $match: {
          dateInString: {
            $gte: subtractOneDay,
            $lte: addOneDay,
          },
          status: "Not Started",
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "goalServeAwayTeamId",
          foreignField: "goalServeTeamId",
          as: "awayTeam",
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "goalServeHomeTeamId",
          foreignField: "goalServeTeamId",
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
        $lookup: {
          from: "odds",
          localField: "goalServeMatchId",
          foreignField: "goalServeMatchId",
          as: "odds",
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
            goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            awayTeamErrors: "$awayTeamError",
            won: "$awayTeamStandings.won",
            lose: "$awayTeamStandings.lost",
            teamImage: "$awayTeamImage.image",
            moneyline: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.awayTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.awayTeamMoneyline.us"] },
                "$odds.awayTeamMoneyline.us",
              ],
            },
            spread: {
              $arrayElemAt: ["$odds.awayTeamSpread", 0],
            },
            total: {
              $arrayElemAt: ["$odds.awayTeamTotal", 0],
            },
          },
          homeTeam: {
            homeTeamName: "$homeTeam.name",
            homeTeamId: "$homeTeam._id",
            goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
            homeTeamRun: "$homeTeamTotalScore",
            homeTeamHit: "$homeTeamHit",
            homeTeamErrors: "$homeTeamError",
            won: "$homeTeamStandings.won",
            lose: "$homeTeamStandings.lost",

            teamImage: "$homeTeamImage.image",
            moneyline: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.homeTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.homeTeamMoneyline.us"] },
                "$odds.homeTeamMoneyline.us",
              ],
            },
            spread: {
              $arrayElemAt: ["$odds.homeTeamSpread", 0],
            },
            total: {
              $arrayElemAt: ["$odds.homeTeamTotal", 0],
            },
          },
        },
      },
    ]);
    await socket("mlbUpcomingMatch", {
      getUpcomingMatch,
    });
  } catch (error: any) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
};

const getWinLost = async () => {
  var winlossArray: any = [];
  let dataJson = {
    json: true,
  };
  const winLoss = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    dataJson,
    `baseball/mlb_standings`
  );
  await winLoss.data.standings.category.league.map(async (item: any) => {
    const getTeam = await item.division.map(async (item: any) => {
      const fff = Object.entries(item?.team);
      for (let index = 0; index < fff.length; index++) {
        const [key, value] = fff[index];
        winlossArray.push(value);
      }

      return winlossArray;
    });
    return getTeam;
  });
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
    let curruntDay = moment().startOf("day").utc().toISOString();
    let subtractOneDay = moment(curruntDay)
      .subtract(12, "hours")
      .utc()
      .toISOString();
    let addOneDay = moment(curruntDay).add(38, "hours").utc().toISOString();

    const getFinalMatch = await Match.aggregate([
      {
        $addFields: {
          spliteTime: {
            $split: ["$dateTimeUtc", " "],
          },
        },
      },
      {
        $addFields: {
          dateutc: {
            $toDate: "$dateTimeUtc",
          },
        },
      },
      {
        $addFields: {
          dateInString: {
            $toString: "$dateutc",
          },
        },
      },
      {
        $match: {
          dateInString: {
            $gte: subtractOneDay,
            $lte: addOneDay,
          },
          status: "Final",
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "goalServeAwayTeamId",
          foreignField: "goalServeTeamId",
          as: "awayTeam",
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "goalServeHomeTeamId",
          foreignField: "goalServeTeamId",
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
        $addFields: {
          awayTeamTotalScoreInNumber: {
            $convert: {
              input: "$awayTeamTotalScore",
              to: "int",
              onError: 0, // Default value when conversion fails
            },
          },
          homeTeamTotalScoreInNumber: {
            $convert: {
              input: "$homeTeamTotalScore",
              to: "int",
              onError: 0, // Default value when conversion fails
            },
          },
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
            goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            awayTeamErrors: "$awayTeamError",
            won: "$awayTeamStandings.won",
            lose: "$awayTeamStandings.lost",
            teamImage: "$awayTeamImage.image",
            isWinner: {
              $cond: {
                if: {
                  $gte: [
                    "$awayTeamTotalScoreInNumber",
                    "$homeTeamTotalScoreInNumber",
                  ],
                },
                then: true,
                else: false,
              },
            },
          },
          homeTeam: {
            homeTeamName: "$homeTeam.name",
            homeTeamId: "$homeTeam._id",
            goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
            homeTeamRun: "$homeTeamTotalScore",
            homeTeamHit: "$homeTeamHit",
            homeTeamErrors: "$homeTeamError",
            won: "$homeTeamStandings.won",
            lose: "$homeTeamStandings.lost",
            teamImage: "$homeTeamImage.image",
            isWinner: {
              $cond: {
                if: {
                  $gte: [
                    "$homeTeamTotalScoreInNumber",
                    "$awayTeamTotalScoreInNumber",
                  ],
                },
                then: true,
                else: false,
              },
            },
          },
        },
      },
    ]);

    await socket("mlbFinalMatch", {
      getFinalMatch,
    });
  } catch (error) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
};

const getLiveMatch = async () => {
  try {
    const getLiveMatch = await Match.aggregate([
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
                $ne: "Postponed",
              },
            },
            {
              status: {
                $ne: "Canceled",
              },
            },
            {
              status: {
                $ne: "Suspended",
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "goalServeAwayTeamId",
          foreignField: "goalServeTeamId",
          as: "awayTeam",
        },
      },
      {
        $lookup: {
          from: "teams",
          localField: "goalServeHomeTeamId",
          foreignField: "goalServeTeamId",
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
        },
      },
      {
        $addFields: {
          inningNo: {
            $split: ["$status", " "],
          },
        },
      },
      {
        $project: {
          id: true,
          date: true,
          status: true,
          inningNo: {
            $last: "$inningNo",
          },
          datetime_utc: "$dateTimeUtc",
          time: true,
          goalServeMatchId: true,
          awayTeam: {
            awayTeamName: "$awayTeam.name",
            awayTeamId: "$awayTeam._id",
            goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            awayTeamErrors: "$awayTeamError",
            won: "$awayTeamStandings.won",
            lose: "$awayTeamStandings.lost",
            teamImage: "$awayTeamImage.image",
          },
          homeTeam: {
            homeTeamName: "$homeTeam.name",
            goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
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
    await socket("mlbLiveMatch", {
      getLiveMatch,
    });
  } catch (error) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "");
  }
};

const mlbScoreWithDate = async (date1: string) => {
  const date2 = moment(date1).add(24, "hours").utc().toISOString();

  const getFinalMatch = await Match.aggregate([
    {
      $addFields: {
        spliteTime: {
          $split: ["$dateTimeUtc", " "],
        },
      },
    },
    {
      $addFields: {
        dateutc: {
          $toDate: "$dateTimeUtc",
        },
      },
    },
    {
      $addFields: {
        dateInString: {
          $toString: "$dateutc",
        },
      },
    },
    {
      $match: {
        dateInString: {
          $gte: date1,
          $lte: date2,
        },
        status: "Final",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
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
      $addFields: {
        awayTeamTotalScoreInNumber: {
          $convert: {
            input: "$awayTeamTotalScore",
            to: "int",
            onError: 0, // Default value when conversion fails
          },
        },
        homeTeamTotalScoreInNumber: {
          $convert: {
            input: "$homeTeamTotalScore",
            to: "int",
            onError: 0, // Default value when conversion fails
          },
        },
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
          goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
          isWinner: {
            $cond: {
              if: {
                $gte: [
                  "$awayTeamTotalScoreInNumber",
                  "$homeTeamTotalScoreInNumber",
                ],
              },
              then: true,
              else: false,
            },
          },
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
          isWinner: {
            $cond: {
              if: {
                $gte: [
                  "$homeTeamTotalScoreInNumber",
                  "$awayTeamTotalScoreInNumber",
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
    },
  ]);

  const getUpcomingMatch = await Match.aggregate([
    {
      $addFields: {
        spliteTime: {
          $split: ["$dateTimeUtc", " "],
        },
      },
    },
    {
      $addFields: {
        dateutc: {
          $toDate: "$dateTimeUtc",
        },
      },
    },
    {
      $addFields: {
        dateInString: {
          $toString: "$dateutc",
        },
      },
    },
    {
      $match: {
        dateInString: {
          $gte: date1,
          $lte: date2,
        },
        status: "Not Started",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
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
          goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
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
};

const createLeague = async (body: any) => {
  const data = new League({
    name: body.name,
    goalServeLeagueId: body.goalServeLeagueId,
  });
  const dataToSave = await data.save();
  return dataToSave;
};

const createPlayer = async () => {
  const team = await Team.find({ isDeleted: false });

  let data = {
    json: true,
  };

  await Promise.all(
    team.map(async (item) => {
      const roasterApi = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        `baseball/${item.goalServeTeamId}_rosters`
      );

      const statsApi = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        `baseball/${item.goalServeTeamId}_stats`
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
            if (item.player.length) {
              item.player.forEach((player: any) => {
                player.type = "fielding";
                allStatPlayers.push(player);
              });
            } else {
              item.player.type = "fielding";
              allStatPlayers.push(item.player);
            }
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

      finalArr.map(async (eVal: any) => {
        let data = {
          goalServeTeamId: item.goalServeTeamId,
          age: eVal.age,
          bats: eVal.bats,
          height: eVal.height,
          goalServePlayerId: eVal.id,
          name: eVal.name,
          number: eVal.number,
          position: eVal.position,
          salary: eVal.salary,
          throws: eVal.throws,
          weight: eVal.weight,
          pitching: eVal?.pitching,
          batting: eVal?.batting,
          fielding: eVal?.fielding,
        };
        const playerData = new Player(data);
        await playerData.save();
      });
    })
  );
};

const getFinalMatchDataFromDB = async (date1: string) => {
  const date2 = moment(date1).add(24, "hours").utc().toISOString();
  return await Match.aggregate([
    {
      $addFields: {
        spliteTime: {
          $split: ["$dateTimeUtc", " "],
        },
      },
    },
    {
      $addFields: {
        dateutc: {
          $toDate: "$dateTimeUtc",
        },
      },
    },
    {
      $addFields: {
        dateInString: {
          $toString: "$dateutc",
        },
      },
    },
    {
      $match: {
        dateInString: {
          $gte: date1,
          $lte: date2,
        },
        status: "Final",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
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
      $addFields: {
        awayTeamTotalScoreInNumber: {
          $convert: {
            input: "$awayTeamTotalScore",
            to: "int",
            onError: 0, // Default value when conversion fails
          },
        },
        homeTeamTotalScoreInNumber: {
          $convert: {
            input: "$homeTeamTotalScore",
            to: "int",
            onError: 0, // Default value when conversion fails
          },
        },
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
          goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
          isWinner: {
            $cond: {
              if: {
                $gte: [
                  "$awayTeamTotalScoreInNumber",
                  "$homeTeamTotalScoreInNumber",
                ],
              },
              then: true,
              else: false,
            },
          },
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
          isWinner: {
            $cond: {
              if: {
                $gte: [
                  "$homeTeamTotalScoreInNumber",
                  "$awayTeamTotalScoreInNumber",
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
    },
  ]);
};
const getUpcomingDataFromMongodb = async (date1: string) => {
  let day = moment().format("D");
  let month = moment().format("MM");
  let year = moment().format("YYYY");
  let date = `${day}.${month}.${year}`;
  const date2 = moment(date1).add(24, "hours").utc().toISOString();
  return await Match.aggregate([
    {
      $addFields: {
        spliteTime: {
          $split: ["$dateTimeUtc", " "],
        },
      },
    },
    {
      $addFields: {
        dateutc: {
          $toDate: "$dateTimeUtc",
        },
      },
    },
    {
      $addFields: {
        dateInString: {
          $toString: "$dateutc",
        },
      },
    },
    {
      $match: {
        dateInString: {
          $gte: date1,
          $lte: date2,
        },
        status: "Not Started",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
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
      $lookup: {
        from: "odds",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "odds",
      },
    },
    {
      $sort: {
        formattedDate: 1,
        time: 1,
      },
    },
    {
      $unwind: {
        path: "$odds",
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
          goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
          moneyline: {
            $cond: [
              { $gte: [{ $toDouble: "$odds.awayTeamMoneyline.us" }, 0] },
              { $concat: ["+", "$odds.awayTeamMoneyline.us"] },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          spread: "$odds.awayTeamSpread",
          total: "$odds.awayTeamTotal",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
          moneyline: {
            $cond: [
              { $gte: [{ $toDouble: "$odds.homeTeamMoneyline.us" }, 0] },
              { $concat: ["+", "$odds.homeTeamMoneyline.us"] },
              "$odds.homeTeamMoneyline.us",
            ],
          },
          spread: "$odds.homeTeamSpread",
          total: "$odds.homeTeamTotal",
        },
      },
    },
  ]);
};
const getLiveDataFromMongodb = async () => {
  return await Match.aggregate([
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
              $ne: "Postponed",
            },
          },
          {
            status: {
              $ne: "Canceled",
            },
          },
          {
            status: {
              $ne: "Suspended",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
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
      $addFields: {
        inningNo: {
          $split: ["$status", " "],
        },
      },
    },
    {
      $project: {
        id: true,
        date: true,
        status: true,
        inningNo: {
          $last: "$inningNo",
        },
        datetime_utc: "$dateTimeUtc",
        time: true,
        goalServeMatchId: true,
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
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
const scoreWithCurrentDate = async (date1: string) => {
  return {
    getLiveMatch: await getLiveDataFromMongodb(),
    getUpcomingMatch: await getUpcomingDataFromMongodb(date1),
    getFinalMatch: await getFinalMatchDataFromDB(date1),
  };
};

const addStanding = async () => {
  let data = {
    json: true,
  };
  const getstanding = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    "baseball/mlb_standings"
  );

  const league: ILeagueModel | undefined | null = await League.findOne({
    goalServeLeagueId: getstanding?.data?.standings?.category?.id,
  });
  getstanding?.data?.standings?.category?.league?.map((item: any) => {
    item.division.map((div: any) => {
      div.team.map(async (team: any) => {
        const teamId: ITeamModel | null | undefined = await Team.findOne({
          goalServeTeamId: team.id,
        });
        let data = {
          leagueId: league?._id,
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

const singleGameBoxScore = async (goalServeMatchId: string) => {
  const getMatch = await Match.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },

    {
      $lookup: {
        from: "teams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "teams",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
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
      $addFields: {
        awayTeamPitchers: {
          $map: {
            input: "$awayTeamPitchers",
            as: "item",
            in: {
              earned_runs: "$$item.earned_runs",
              earned_runs_average: "$$item.earned_runs_average",
              hbp: "$$item.hbp",
              hits: "$$item.hits",
              holds: "$$item.holds",
              home_runs: "$$item.home_runs",

              innings_pitched: "$$item.innings_pitched",
              loss: "$$item.loss",
              name: "$$item.name",

              runs: "$$item.runs",
              saves: "$$item.saves",
              strikeouts: "$$item.strikeouts",
              walks: "$$item.walks",
              win: "$$item.win",
              pc_st: "$$item.pc-st",
            },
          },
        },
      },
    },
    {
      $addFields: {
        homeTeamPitchers: {
          $map: {
            input: "$homeTeamPitchers",
            as: "item",
            in: {
              earned_runs: "$$item.earned_runs",
              earned_runs_average: "$$item.earned_runs_average",
              hbp: "$$item.hbp",
              hits: "$$item.hits",
              holds: "$$item.holds",
              home_runs: "$$item.home_runs",

              innings_pitched: "$$item.innings_pitched",
              loss: "$$item.loss",
              name: "$$item.name",

              runs: "$$item.runs",
              saves: "$$item.saves",
              strikeouts: "$$item.strikeouts",
              walks: "$$item.walks",
              win: "$$item.win",
              pc_st: "$$item.pc-st",
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: "odds",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "odds",
      },
    },
    {
      $unwind: {
        path: "$odds",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        awayTeamTotalScoreInNumber: {
          $convert: {
            input: "$awayTeamTotalScore",
            to: "int",
            onError: 0, // Default value when conversion fails
          },
        },
        homeTeamTotalScoreInNumber: {
          $convert: {
            input: "$homeTeamTotalScore",
            to: "int",
            onError: 0, // Default value when conversion fails
          },
        },
      },
    },
    {
      $project: {
        id: true,
        attendance: true,
        status: true,
        venueName: true,
        datetime_utc: "$dateTimeUtc",
        goalServeMatchId: true,
        awayTeamFullName: "$awayTeam.name",
        homeTeamFullName: "$homeTeam.name",
        awayTeamAbbreviation: "$awayTeam.abbreviation",
        homeTeamAbbreviation: "$homeTeam.abbreviation",
        homeTeamImage: "$homeTeamImage.image",
        awayTeamImage: "$awayTeamImage.image",
        homeTeamTotalScore: true,
        awayTeamTotalScore: true,
        innings: {
          awayTeam: "$awayTeamInnings",
          homeTeam: "$homeTeamInnings",
        },
        event: true,
        hittingStatistics: {
          homeTeam: "$homeTeamHitters",
          awayTeam: "$awayTeamHitters",
        },
        pitchingStatistics: {
          awayTeam: "$awayTeamPitchers",
          homeTeam: "$homeTeamPitchers",
        },
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          isWinner: {
            $cond: {
              if: {
                $gte: [
                  "$awayTeamTotalScoreInNumber",
                  "$homeTeamTotalScoreInNumber",
                ],
              },
              then: true,
              else: false,
            },
          },
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          isWinner: {
            $cond: {
              if: {
                $gte: [
                  "$homeTeamTotalScoreInNumber",
                  "$awayTeamTotalScoreInNumber",
                ],
              },
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
                      cond: {
                        $ne: ["$$pitcher.win", ""],
                      },
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
                      cond: {
                        $ne: ["$$pitcher.win", ""],
                      },
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
                          cond: {
                            $ne: ["$$pitcher.win", ""],
                          },
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
                          cond: {
                            $ne: ["$$pitcher.win", ""],
                          },
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
                      cond: {
                        $ne: ["$$pitcher.loss", ""],
                      },
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
                      cond: {
                        $ne: ["$$pitcher.loss", ""],
                      },
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
                          cond: {
                            $ne: ["$$pitcher.loss", ""],
                          },
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
                          cond: {
                            $ne: ["$$pitcher.loss", ""],
                          },
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
                      cond: {
                        $ne: ["$$pitcher.saves", ""],
                      },
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
                      cond: {
                        $ne: ["$$pitcher.saves", ""],
                      },
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
                          cond: {
                            $ne: ["$$pitcher.saves", ""],
                          },
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
                          cond: {
                            $ne: ["$$pitcher.saves", ""],
                          },
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
        closingOddsAndOutcome: {
          awayTeamMoneyLine: {
            $cond: [
              { $gte: [{ $toDouble: "$odds.awayTeamMoneyline.us" }, 0] },
              { $concat: ["+", "$odds.awayTeamMoneyline.us"] },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          homeTeamMoneyLine: {
            $cond: [
              { $gte: [{ $toDouble: "$odds.homeTeamMoneyline.us" }, 0] },
              { $concat: ["+", "$odds.homeTeamMoneyline.us"] },
              "$odds.homeTeamMoneyline.us",
            ],
          },
          homeTeamSpread: "$odds.homeTeamSpread",
          awayTeamSpread: "$odds.awayTeamSpread",
          homeTeamTotal: "$odds.homeTeamTotal",
          awayTeamTotal: "$odds.awayTeamTotal",
          awayTeamTotalScoreInNumber: "$awayTeamTotalScoreInNumber",
          homeTeamTotalScoreInNumber: "$homeTeamTotalScoreInNumber",
          scoreDifference: {
            $abs: {
              $subtract: [
                "$awayTeamTotalScoreInNumber",
                "$homeTeamTotalScoreInNumber",
              ],
            },
          },
          totalGameScore: {
            $add: [
              "$awayTeamTotalScoreInNumber",
              "$homeTeamTotalScoreInNumber",
            ],
          },
        },
      },
    },
  ]);
  return { getMatch: getMatch[0] };
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

  var daylist = getDaysArray(new Date("2023-05-25"), new Date("2023-10-01"));

  for (let i = 0; i < daylist?.length; i++) {
    let data = {
      json: true,
      date1: daylist[i],
    };
    const mlb_shedule = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/mlb_shedule"
    );

    const matchArray = await mlb_shedule?.data?.fixtures?.category?.matches
      ?.match;
    if (matchArray?.length > 0 && matchArray) {
      const league: ILeagueModel | undefined | null = await League.findOne({
        goalServeLeagueId: mlb_shedule?.data.fixtures?.category?.id,
      });
      for (let j = 0; j < matchArray?.length; j++) {
        const data: Partial<IMatchModel> = {
          leagueId: league?._id,
          goalServeLeagueId: league?.goalServeLeagueId,
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

        const teamIdAway: ITeamModel | null | undefined = await Team.findOne({
          goalServeTeamId: matchArray[j].awayteam.id,
        });
        if (teamIdAway) {
          data.awayTeamId = teamIdAway.id;
          data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
            ? teamIdAway?.goalServeTeamId
            : undefined;
        }
        const teamIdHome: ITeamModel | null | undefined = await Team.findOne({
          goalServeTeamId: matchArray[j].hometeam.id,
        });
        if (teamIdHome) {
          data.homeTeamId = teamIdHome.id;
          data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
        }
        const matchData = new Match(data);
        await matchData.save();
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

  var daylist = getDaysArray(new Date("2023-02-28"), new Date("2023-06-08"));
  for (let i = 0; i < daylist?.length; i++) {
    let data = { json: true, date: daylist[i] };
    const getMatch = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/usa"
    );

    const matchArray = await getMatch?.data?.scores?.category?.match;
    if (matchArray?.length > 0) {
      const league: ILeagueModel | undefined | null = await League.findOne({
        goalServeLeagueId: getMatch?.data.scores.category.id,
      });

      for (let j = 0; j < matchArray?.length; j++) {
        const data: Partial<IMatchModel> = {
          leagueId: league?._id,
          goalServeLeagueId: league?.goalServeLeagueId,
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

        const teamIdAway: ITeamModel | null | undefined = await Team.findOne({
          goalServeTeamId: matchArray[j].awayteam.id,
        });
        if (teamIdAway) {
          data.awayTeamId = teamIdAway.id;
          data.goalServeAwayTeamId = teamIdAway.goalServeTeamId;
        }
        const teamIdHome: ITeamModel | null | undefined = await Team.findOne({
          goalServeTeamId: matchArray[j].hometeam.id,
        });
        if (teamIdHome) {
          data.homeTeamId = teamIdHome.id;
          data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
        }
        const matchData = new Match(data);
        await matchData.save();
      }
    }
  }
};
const singleGameBoxScoreUpcomming = async (goalServeMatchId: string) => {
  const getMatch = await Match.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },
    {
      $lookup: {
        from: "teams",
        let: {
          awayTeamId: "$goalServeAwayTeamId",
          homeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $facet: {
              awayTeam: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeTeamId", "$$awayTeamId"],
                    },
                  },
                },
                {
                  $project: {
                    name: 1,
                    abbreviation: 1,
                    goalServeTeamId: 1,
                  },
                },
              ],
              homeTeam: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeTeamId", "$$homeTeamId"],
                    },
                  },
                },
                {
                  $project: {
                    name: 1,
                    abbreviation: 1,
                    goalServeTeamId: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              awayTeam: {
                $arrayElemAt: ["$awayTeam", 0],
              },
              homeTeam: {
                $arrayElemAt: ["$homeTeam", 0],
              },
            },
          },
        ],
        as: "teams",
      },
    },
    {
      $lookup: {
        from: "standings",
        let: {
          awayTeamId: "$goalServeAwayTeamId",
          homeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $facet: {
              awayTeam: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeTeamId", "$$awayTeamId"],
                    },
                  },
                },
                {
                  $project: {
                    goalServeTeamId: 1,
                    won: 1,
                    lost: 1,
                    goals_against: 1,
                    goals_for: 1,
                  },
                },
              ],
              homeTeam: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeTeamId", "$$homeTeamId"],
                    },
                  },
                },
                {
                  $project: {
                    goalServeTeamId: 1,
                    won: 1,
                    lost: 1,
                    goals_against: 1,
                    goals_for: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              awayTeam: {
                $arrayElemAt: ["$awayTeam", 0],
              },
              homeTeam: {
                $arrayElemAt: ["$homeTeam", 0],
              },
            },
          },
        ],
        as: "standings",
      },
    },
    {
      $lookup: {
        from: "teamimages",
        let: {
          awayTeamId: "$goalServeAwayTeamId",
          homeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $facet: {
              awayTeam: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeTeamId", "$$awayTeamId"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    image: 1,
                  },
                },
              ],
              homeTeam: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeTeamId", "$$homeTeamId"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    image: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              awayTeam: {
                $arrayElemAt: ["$awayTeam", 0],
              },
              homeTeam: {
                $arrayElemAt: ["$homeTeam", 0],
              },
            },
          },
        ],
        as: "teamImages",
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
      $lookup: {
        from: "injuries",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamInjuredPlayers",
      },
    },
    {
      $lookup: {
        from: "players",
        let: {
          awayTeamId: "$goalServeAwayTeamId",
          homeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
              
                  
                    $in: ["$goalServeTeamId", ["$$awayTeamId", "$$homeTeamId"]],
                
               
              },
            },
          },
        ],
        as: "players",
      },
    },

    {
      $lookup: {
        from: "statsteams",
        let: {
          awayTeamId: "$goalServeAwayTeamId",
          homeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $facet: {
              awayTeam: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeTeamId", "$$awayTeamId"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    home_runs: 1,
                    runs_batted_in: 1,
                    slugging_percentage: 1,
                    on_base_percentage: 1,
                    runs: 1,
                    batting_avg: 1,
                    hits: 1,
                  },
                },
              ],
              homeTeam: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$goalServeTeamId", "$$homeTeamId"],
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    home_runs: 1,
                    runs_batted_in: 1,

                    steals: 1,
                    hits: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              awayTeam: {
                $arrayElemAt: ["$awayTeam", 0],
              },
              homeTeam: {
                $arrayElemAt: ["$homeTeam", 0],
              },
            },
          },
        ],
        as: "statsTeams",
      },
    },

    {
      $lookup: {
        from: "odds",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "odds",
      },
    },
    {
      $unwind: {
        path: "$odds",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "odds",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "closingOdds",
      },
    },
    {
      $unwind: {
        path: "$closingOdds",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        awayTeamTotalScoreInNumber: {
          $convert: {
            input: "$awayTeamTotalScore",
            to: "int",
            onError: 0, // Default value when conversion fails
          },
        },
        homeTeamTotalScoreInNumber: {
          $convert: {
            input: "$homeTeamTotalScore",
            to: "int",
            onError: 0, // Default value when conversion fails
          },
        },
      },
    },
    {
      $project: {
        id: true,
        attendance: true,
        status: true,
        venueName: true,

        datetime_utc: "$dateTimeUtc",
        awayTeamFullName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
        homeTeamFullName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
        awayTeamAbbreviation: {
          $arrayElemAt: ["$teams.awayTeam.abbreviation", 0],
        },
        homeTeamAbbreviation: {
          $arrayElemAt: ["$teams.homeTeam.abbreviation", 0],
        },
        homeTeamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
        awayTeamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
        awayTeam: {
          awayTeamName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
          goalServeAwayTeamId: {
            $arrayElemAt: ["$teams.awayTeam.goalServeTeamId", 0],
          },
          won: { $arrayElemAt: ["$standings.awayTeam.won", 0] },
          lose: { $arrayElemAt: ["$standings.awayTeam.lost", 0] },
          teamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          moneyline: {
            $cond: [
              { $gte: [{ $toDouble: "$odds.awayTeamMoneyline.us" }, 0] },
              { $concat: ["+", "$odds.awayTeamMoneyline.us"] },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          spread: "$odds.awayTeamSpread",

          total: "$odds.awayTeamTotal",
        },
        homeTeam: {
          homeTeamName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
          goalServeHomeTeamId: {
            $arrayElemAt: ["$teams.homeTeam.goalServeTeamId", 0],
          },
          won: { $arrayElemAt: ["$standings.homeTeam.won", 0] },
          lose: { $arrayElemAt: ["$standings.homeTeam.lost", 0] },
          teamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          moneyline: {
            $cond: [
              { $gte: [{ $toDouble: "$odds.homeTeamMoneyline.us" }, 0] },
              { $concat: ["+", "$odds.homeTeamMoneyline.us"] },
              "$odds.homeTeamMoneyline.us",
            ],
          },
          spread: "$odds.homeTeamSpread",

          total: "$odds.homeTeamTotal",
        },
        injuredPlayers: {
          homeTeam: {
            $map: {
              input: "$homeTeamInjuredPlayers",
              as: "item",
              in: {
                date: "$$item.date",
                description: "$$item.description",
                goalServePlayerId: "$$item.goalServePlayerId",
                playerName: "$$item.playerName",
                status: "$$item.status",
                teamId: "$$item.teamId",
                goalServeTeamId: "$$item.goalServeTeamId",
              },
            },
          },
          awayTeam: {
            $map: {
              input: "$awayTeamInjuredPlayers",
              as: "item",
              in: {
                date: "$$item.date",
                description: "$$item.description",
                goalServePlayerId: "$$item.goalServePlayerId",
                playerName: "$$item.playerName",
                status: "$$item.status",
                teamId: "$$item.teamId",
                goalServeTeamId: "$$item.goalServeTeamId",
              },
            },
          },
        },

        teamStatistics: [
          {
            title: "Hits",
            homeTeam: { $arrayElemAt: ["$statsTeams.homeTeam.hits", 0] },
            awayTeam: { $arrayElemAt: ["$statsTeams.awayTeam.hits", 0] },
            total: {
              $add: [
                {
                  $toInt: { $arrayElemAt: ["$statsTeams.homeTeam.hits", 0] },
                },
                {
                  $toInt: { $arrayElemAt: ["$statsTeams.awayTeam.hits", 0] },
                },
              ],
            },
          },
          {
            title: "RBI",
            homeTeam: {
              $arrayElemAt: ["$statsTeams.homeTeam.runs_batted_in", 0],
            },
            awayTeam: {
              $arrayElemAt: ["$statsTeams.awayTeam.runs_batted_in", 0],
            },
            total: {
              $add: [
                {
                  $toInt: {
                    $arrayElemAt: ["$statsTeams.homeTeam.runs_batted_in", 0],
                  },
                },
                {
                  $toInt: {
                    $arrayElemAt: ["$statsTeams.awayTeam.runs_batted_in", 0],
                  },
                },
              ],
            },
          },
          {
            title: "Home Runs",
            homeTeam: {
              $arrayElemAt: ["$statsTeams.homeTeam.home_runs", 0],
            },
            awayTeam: {
              $arrayElemAt: ["$statsTeams.awayTeam.home_runs", 0],
            },
            total: {
              $add: [
                {
                  $toInt: {
                    $arrayElemAt: ["$statsTeams.awayTeam.home_runs", 0],
                  },
                },
                {
                  $toInt: {
                    $arrayElemAt: ["$statsTeams.homeTeam.home_runs", 0],
                  },
                },
              ],
            },
          },
        ],

        playerStatistics: {
          awayTeam: {
            $map: {
              input: {
                $filter: {
                  input: "$players",
                  cond: {
                    $eq: ["$$this.goalServeTeamId", "$goalServeAwayTeamId"],
                  },
                },
              },
              as: "player",
              in: {
                $cond: [
                  { $eq: ["$$player", []] },
                  [],
                  {
                    playerName: "$$player.name",
                    goalServePlayerId: "$$player.goalServePlayerId",
                    goalServeTeamId: "$$player.goalServeTeamId",
                 
                    at_bats: "$$player.batting.at_bats",
                    hits: "$$player.batting.hits",
                    runs: "$$player.batting.runs",
                    runs_batted_in: "$$player.batting.runs_batted_in",
                    walks: "$$player.batting.walks",
                  },
                ],
              },
            },
          },
          homeTeam: {
            $map: {
              input: {
                $filter: {
                  input: "$players",
                  cond: {
                    $eq: ["$$this.goalServeTeamId", "$goalServeHomeTeamId"],
                  },
                },
              },
              as: "player",
              in: {
                $cond: [
                  { $eq: ["$$player", []] },
                  [],
                  {
                    playerName: "$$player.name",
                    goalServePlayerId: "$$player.goalServePlayerId",
                    goalServeTeamId: "$$player.goalServeTeamId",    
                    at_bats: "$$player.batting.at_bats",
                    hits: "$$player.batting.hits",
                    runs: "$$player.batting.runs",
                    runs_batted_in: "$$player.batting.runs_batted_in",
                    walks: "$$player.batting.walks",
                  },
                ],
              },
            },
          },
        },
        closingOddsAndOutcome: {
          awayTeamMoneyLine: {
            $cond: [
              { $gte: [{ $toDouble: "$closingOdds.awayTeamMoneyline.us" }, 0] },
              { $concat: ["+", "$closingOdds.awayTeamMoneyline.us"] },
              "$closingOdds.awayTeamMoneyline.us",
            ],
          },
          homeTeamMoneyLine: {
            $cond: [
              { $gte: [{ $toDouble: "$closingOdds.homeTeamMoneyline.us" }, 0] },
              { $concat: ["+", "$closingOdds.homeTeamMoneyline.us"] },
              "$closingOdds.homeTeamMoneyline.us",
            ],
          },
          homeTeamSpread: "$closingOdds.homeTeamSpread",
          awayTeamSpread: "$closingOdds.awayTeamSpread",
          homeTeamTotal: "$closingOdds.homeTeamTotal",
          awayTeamTotal: "$closingOdds.awayTeamTotal",
          awayTeamTotalScoreInNumber: "$awayTeamTotalScoreInNumber",
          homeTeamTotalScoreInNumber: "$homeTeamTotalScoreInNumber",
          scoreDifference: {
            $abs: {
              $subtract: [
                "$awayTeamTotalScoreInNumber",
                "$homeTeamTotalScoreInNumber",
              ],
            },
          },
          totalGameScore: {
            $add: [
              "$awayTeamTotalScoreInNumber",
              "$homeTeamTotalScoreInNumber",
            ],
          },
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
    let data = { json: true, showodds: "1", bm: "451," };
    const getScore = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/mlb_shedule"
    );
    var matchData = getScore?.data?.fixtures?.category?.matches;
    if (matchData?.length > 0) {
      for (let i = 0; i < matchData?.length; i++) {
        for (let j = 0; j < matchData[i]?.match?.length; j++) {
          const findOdd = await Odd.find({
            goalServeMatchId: matchData[i]?.match[j].id,
          });
          const league: ILeagueModel | undefined | null = await League.findOne({
            goalServeLeagueId: getScore?.data.fixtures?.category?.id,
          });
          const getMoneyLine: any = await getOdds(
            "Home/Away",
            matchData[i]?.match[j]?.odds?.type
          );
          const awayTeamMoneyline = getMoneyLine
            ? getMoneyLine?.bookmaker?.odd?.find(
                (item: any) => item?.name === "2"
              )
            : {};
          const homeTeamMoneyline = getMoneyLine
            ? getMoneyLine?.bookmaker?.odd?.find(
                (item: any) => item?.name === "1"
              )
            : {};
          // getSpread
          const getSpread = await getOdds(
            "Run Line",
            matchData[i]?.match[j]?.odds?.type
          );
          const getAwayTeamRunLine = await getRunLine(
            matchData[i]?.match[j]?.awayteam?.name,
            getSpread?.bookmaker?.odd
          );
          const getHomeTeamRunLine = await getRunLine(
            matchData[i]?.match[j]?.hometeam?.name,
            getSpread?.bookmaker?.odd
          );
          const awayTeamSpread = getAwayTeamRunLine
            ? getAwayTeamRunLine?.name?.split(" ").slice(-1)[0]
            : "";

          const homeTeamSpread = getHomeTeamRunLine
            ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
            : "";
          const total = await getTotal(
            "Over/Under",
            matchData[i]?.match[j]?.odds?.type
          );
          const totalValues = await getTotalValues(total);
          let data = {
            goalServerLeagueId: league?.goalServeLeagueId,
            goalServeMatchId: matchData[i]?.match[j]?.id,
            goalServeHomeTeamId: matchData[i]?.match[j]?.hometeam?.id,
            goalServeAwayTeamId: matchData[i]?.match[j]?.awayteam?.id,
            homeTeamSpread: homeTeamSpread,
            homeTeamTotal: totalValues,
            awayTeamSpread: awayTeamSpread,
            awayTeamTotal: totalValues,
            awayTeamMoneyline: awayTeamMoneyline,
            homeTeamMoneyline: homeTeamMoneyline,
            status: matchData[i]?.match[j]?.status,
          };
          if (findOdd?.length == 0) {
            const oddsData = new Odd(data);
            const savedOddsData = await oddsData.save();
          }
        }
      }
    }
  } catch (error: any) {
    console.log("error", error);
  }
};

const updateCurruntDateRecord = async () => {
  try {
    let data = {
      json: true,
    };
    const getMatch = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/usa"
    );

    const matchArray = await getMatch?.data?.scores?.category?.match;
    if (matchArray?.length > 0) {
      for (let j = 0; j < matchArray?.length; j++) {
        const league: ILeagueModel | undefined | null = await League.findOne({
          goalServeLeagueId: getMatch?.data.scores.category.id,
        });
        if (
          matchArray[j].status != "Not Started" &&
          matchArray[j].status != "Final"
        ) {
          const data: Partial<IMatchModel> = {
            leagueId: league?._id,
            goalServeLeagueId: league?.goalServeLeagueId,
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
            event: matchArray[j].events?.event
              ? matchArray[j].events?.event
              : [],
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
          const teamIdAway: ITeamModel | null | undefined = await Team.findOne({
            goalServeTeamId: matchArray[j].awayteam.id,
          });
          if (teamIdAway) {
            data.awayTeamId = teamIdAway.id;
            data.goalServeAwayTeamId = teamIdAway.goalServeTeamId;
          }
          const teamIdHome: ITeamModel | null | undefined = await Team.findOne({
            goalServeTeamId: matchArray[j].hometeam.id,
          });
          if (teamIdHome) {
            data.homeTeamId = teamIdHome.id;
            data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
          }
          await Match.findOneAndUpdate(
            { goalServeMatchId: data.goalServeMatchId },
            { $set: data },
            { new: true }
          );
        } else {
          const data: Partial<IMatchModel> = {
            leagueId: league?._id,
            goalServeLeagueId: league?.goalServeLeagueId,
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
            event: matchArray[j].events?.event
              ? matchArray[j].events?.event
              : [],
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
          const teamIdAway: ITeamModel | null | undefined = await Team.findOne({
            goalServeTeamId: matchArray[j].awayteam.id,
          });
          if (teamIdAway) {
            data.awayTeamId = teamIdAway.id;
            data.goalServeAwayTeamId = teamIdAway.goalServeTeamId;
          }
          const teamIdHome: ITeamModel | null | undefined = await Team.findOne({
            goalServeTeamId: matchArray[j].hometeam.id,
          });
          if (teamIdHome) {
            data.homeTeamId = teamIdHome.id;
            data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
          }
          await Match.findOneAndUpdate(
            { goalServeMatchId: data.goalServeMatchId },
            { $set: data },
            { new: true }
          );
        }
        if (
          matchArray[j].status != "Not Started" &&
          matchArray[j].status != "Final" &&
          matchArray[j].status != "Postponed" &&
          matchArray[j].status != "Canceled" &&
          matchArray[j].status != "Suspended"
        ) {
          const goalServeMatchId = matchArray[j].id;
          await Bet.updateMany(
            {
              status: "CONFIRMED",
              goalServeMatchId: goalServeMatchId,
            },
            {
              status: "ACTIVE",
            }
          );
        } else if (matchArray[j].status == "Final") {
          const homeTeamTotalScore = parseFloat(
            matchArray[j].hometeam.totalscore
          );
          const awayTeamTotalScore = parseFloat(
            matchArray[j].awayteam.totalscore
          );
          const goalServeMatchId = matchArray[j].id;
          const goalServeWinTeamId =
            homeTeamTotalScore > awayTeamTotalScore
              ? matchArray[j].hometeam.id
              : matchArray[j].awayteam.id;
          await betServices.declareResultMatch(
            parseInt(goalServeMatchId),
            parseInt(goalServeWinTeamId)
          );
        }
      }
    }
  } catch (error: any) {
    console.log("error", error);
  }
};

const statsPlayerPitching = async () => {
  const team = await Team.find({ isDeleted: false });

  await Promise.all(
    team.map(async (item: any) => {
      let data = {
        json: true,
      };

      const statsApi = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        `baseball/${item.goalServeTeamId}_stats`
      );

      const pitchingPlayer = statsApi.data.statistic.category.filter(
        (val: any) => val.name === "Pitching"
      )[0];

      pitchingPlayer?.team?.player.map(async (player: any) => {
        let data = player;
        data.goalServePlayerId = player.id;
        const stat = new StatsPlayer(data);
        await stat.save();
      });
    })
  );
};

const teamStats = async () => {
  let data = {
    json: true,
  };
  const teamStatsNl = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    "baseball/nl_team_batting"
  );

  await Promise.all(
    teamStatsNl.data.statistic.category.team.map(async (item: any) => {
      const team = await Team.findOne({ name: item.name });
      let data = item;
      data.category = teamStatsNl.data.statistic.category.name;
      data.teamId = team?.id;
      data.goalServeTeamId = team?.goalServeTeamId;
      const stat = new StatsTeam(data);
      await stat.save();
    })
  );

  const teamStatsAL = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    "baseball/al_team_batting"
  );

  await Promise.all(
    teamStatsAL.data.statistic.category.team.map(async (item: any) => {
      const team = await Team.findOne({ name: item.name });
      let data = item;
      data.category = teamStatsAL.data.statistic.category.name;
      data.teamId = team?.id;
      data.goalServeTeamId = team?.goalServeTeamId;
      const stat = new StatsTeam(data);
      await stat.save();
    })
  );
};

const updateInjuryRecored = async () => {
  const team = await Team.find({ isDeleted: false });
  await Promise.all(
    team.map(async (item) => {
      let data = {
        json: true,
      };
      const injuryApi = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        `baseball/${item?.goalServeTeamId}_injuries`
      );

      const injuryArray1 = injuryApi?.data?.team;
      const existingPlayers = await Injury.find({
        goalServeTeamId: item?.goalServeTeamId,
      });
      if (injuryArray1?.report?.length) {
        // Find the extra entries in the existingPlayers array
        const extraEntries = existingPlayers.filter((player) => {
          const playerExists = injuryArray1?.report?.some(
            (val: any) => val?.player_id === player.goalServePlayerId
          );
          return !playerExists;
        });
        await Injury.deleteMany({
          _id: { $in: extraEntries.map((player) => player._id) },
        });

        await Promise.all(
          injuryArray1?.report?.map(async (val: any) => {
            const player = await Player.findOne({
              goalServePlayerId: val?.player_id,
            });
            const data = {
              date: val?.date,
              description: val?.description,
              goalServePlayerId: val?.player_id,
              playerName: val?.player_name,
              playerId: player?.id,
              status: val?.status,
              goalServeTeamId: injuryApi?.data?.team?.id,
              teamId: item?.id,
            };
            await Injury.updateOne(
              {
                goalServeTeamId: data?.goalServeTeamId,
                goalServePlayerId: data?.goalServePlayerId,
              },
              { $set: data },
              { upsert: true }
            );
          })
        );
      } else if (injuryArray1?.report) {
        const extraEntries = existingPlayers.filter((player) => {
          const playerExists = Array(injuryArray1?.report)?.some(
            (val: any) => val?.player_id === player.goalServePlayerId
          );
          return !playerExists;
        });
        await Injury.deleteMany({
          _id: { $in: extraEntries.map((player) => player._id) },
        });
        const val = injuryArray1?.report;
        const player = await Player.findOne({
          goalServePlayerId: val?.player_id,
        });

        const data = {
          date: val?.date,
          description: val?.description,
          goalServePlayerId: val?.player_id,
          playerName: val?.player_name,
          status: val?.status,
          goalServeTeamId: injuryArray1?.id,
          teamId: item?.id,
          playerId: player?.id,
        };

        await Injury.updateOne(
          {
            goalServeTeamId: data?.goalServeTeamId,
            goalServePlayerId: data?.goalServePlayerId,
          },
          { $set: data },
          { upsert: true }
        );
      } else {
        await Injury.deleteMany({
          _id: { $in: existingPlayers.map((player) => player._id) },
        });
      }
    })
  );
};

const updateStandingRecord = async () => {
  let data = {
    json: true,
  };
  const getstanding = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    "baseball/mlb_standings"
  );

  const league: ILeagueModel | undefined | null = await League.findOne({
    goalServeLeagueId: getstanding?.data?.standings?.category?.id,
  });
  getstanding?.data?.standings?.category?.league?.map((item: any) => {
    item.division.map((div: any) => {
      div.team.map(async (team: any) => {
        const teamId: ITeamModel | null | undefined = await Team.findOne({
          goalServeTeamId: team.id,
        });
        let data = {
          leagueId: league?._id,
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

        await Standings.findOneAndUpdate(
          { goalServeTeamId: data.goalServeTeamId },
          { $set: data },
          { new: true }
        );
      });
    });
  });
};
const updateTeamStats = async () => {
  let data = {
    json: true,
  };
  const teamStatsNl = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    "baseball/nl_team_batting"
  );

  await Promise.all(
    teamStatsNl.data.statistic.category.team.map(async (item: any) => {
      const team = await Team.findOne({ name: item.name });
      let data = item;
      data.category = teamStatsNl.data.statistic.category.name;
      data.teamId = team?.id;
      data.goalServeTeamId = team?.goalServeTeamId;
      await StatsTeam.findOneAndUpdate(
        { goalServeTeamId: data.goalServeTeamId },
        { $set: data },
        { new: true }
      );
    })
  );

  const teamStatsAL = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    "baseball/al_team_batting"
  );

  await Promise.all(
    teamStatsAL.data.statistic.category.team.map(async (item: any) => {
      const team = await Team.findOne({ name: item.name });
      let data = item;
      data.category = teamStatsAL.data.statistic.category.name;
      data.teamId = team?.id;
      data.goalServeTeamId = team?.goalServeTeamId;
      await StatsTeam.findOneAndUpdate(
        { goalServeTeamId: data.goalServeTeamId },
        { $set: data },
        { new: true }
      );
    })
  );
};
const updatePlayerStats = async () => {
  const team = await Team.find({ isDeleted: false });

  let data = {
    json: true,
  };

  await Promise.all(
    team.map(async (item) => {
      const roasterApi = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        `baseball/${item.goalServeTeamId}_rosters`
      );

      const statsApi = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        `baseball/${item.goalServeTeamId}_stats`
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
            if (item.player.length) {
              item.player.forEach((player: any) => {
                player.type = "fielding";
                allStatPlayers.push(player);
              });
            } else {
              item.player.type = "fielding";
              allStatPlayers.push(item.player);
            }
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

      finalArr.map(async (eVal: any) => {
        let data = {
          goalServeTeamId: item.goalServeTeamId,
          age: eVal.age,
          bats: eVal.bats,
          height: eVal.height,
          goalServePlayerId: eVal.id,
          name: eVal.name,
          number: eVal.number,
          position: eVal.position,
          salary: eVal.salary,
          throws: eVal.throws,
          weight: eVal.weight,
          pitching: eVal?.pitching,
          batting: eVal?.batting,
          fielding: eVal?.fielding,
        };
        await Player.findOneAndUpdate(
          { goalServePlayerId: eVal.id },
          { $set: data },
          { new: true }
        );
      });
    })
  );
};

const mlbGetTeam = async (goalServeTeamId: string) => {
  const getTeam = await Standings.aggregate([
    {
      $match: {
        goalServeTeamId: Number(goalServeTeamId),
      },
    },
    {
      $lookup: {
        from: "teamimages",
        localField: "goalServeTeamId",
        foreignField: "goalServeTeamId",
        as: "images",
      },
    },
    {
      $unwind: {
        path: "$images",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        id: true,
        goalServeTeamId: true,
        teamImage: "$images.image",
        name: true,
      },
    },
  ]);
  return { getTeam: getTeam[0] };
};
export default {
  mlbGetTeam,
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
  createPlayer,
  scoreWithCurrentDate,
  addStanding,
  singleGameBoxScore,
  addMatchDataFuture,
  getStandingData,
  addMatchWithNewModel,
  singleGameBoxScoreUpcomming,
  createAndUpdateOdds,
  updateCurruntDateRecord,
  statsPlayerPitching,
  teamStats,
  updateInjuryRecored,
  updateStandingRecord,
  updateTeamStats,
  updatePlayerStats,
};
