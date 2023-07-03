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
import StatsTeam from "../../models/documents/MLB/teamStats.model";
import ITeamModel from "../../models/interfaces/team.interface";
import IMatchModel from "../../models/interfaces/match.interface";
import ILeagueModel from "../../models/interfaces/league.interface";
import IOddModel from "../../models/interfaces/odd.interface";
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
          let: { matchId: "$goalServeMatchId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$matchId", "$goalServeMatchId"] },
                    { $eq: ["$status", "Not Started"] },
                  ],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: "odds",
        },
      },
      {
        $addFields: {
          odds: {
            $arrayElemAt: ["$odds", 0],
          },
        },
      },
      {
        $addFields: {
          awayMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.awayTeamMoneyline.us"],
              },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          homeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.homeTeamMoneyline.us"],
              },
              "$odds.homeTeamMoneyline.us",
            ],
          },
          awayOutcomeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$outcome.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$outcome.awayTeamMoneyline.us"],
              },
              "$outcome.awayTeamMoneyline.us",
            ],
          },
          homeOutcomeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$outcome.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$outcome.homeTeamMoneyline.us"],
              },
              "$outcome.homeTeamMoneyline.us",
            ],
          },
        },
      },
      {
        $addFields: {
          isAwayTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isAwayTeamOutcomeNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayOutcomeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamOutcomeNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeOutcomeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
        },
      },
      {
        $addFields: {
          isAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "$isAwayTeamNagative"],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
          isOutcomeAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      "$isHomeTeamOutcomeNagative",
                      "$isAwayTeamOutcomeNagative",
                    ],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamOutcomeNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamOutcomeNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
        },
      },
      {
        $addFields: {
          favorite: {
            $cond: {
              if: {
                $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayMoneyline",
                          },
                          {
                            $toDouble: "$homeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeMoneyline",
                          },
                          {
                            $toDouble: "$awayMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
          favoriteOutcome: {
            $cond: {
              if: {
                $eq: ["$isOutcomeAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayOutcomeMoneyline",
                          },
                          {
                            $toDouble: "$homeOutcomeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayOutcomeMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeOutcomeMoneyline",
                          },
                          {
                            $toDouble: "$awayOutcomeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeOutcomeMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamOutcomeNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayOutcomeMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeOutcomeMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          underdog: {
            $cond: {
              if: {
                $eq: ["$favorite.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayMoneyline" },
                },
              },
            },
          },
          underdogOutcome: {
            $cond: {
              if: {
                $eq: ["$favoriteOutcome.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeOutcomeMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayOutcomeMoneyline" },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          favIP: {
            $multiply: [
              {
                $divide: [
                  "$favorite.moneyline",
                  {
                    $add: ["$favorite.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIp: {
            $multiply: [
              {
                $divide: [
                  100,
                  {
                    $add: ["$underdog.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          favIPOutcome: {
            $multiply: [
              {
                $divide: [
                  "$favoriteOutcome.moneyline",
                  {
                    $add: ["$favoriteOutcome.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIpOutcome: {
            $multiply: [
              {
                $divide: [
                  "$underdogOutcome.moneyline",
                  {
                    $add: ["$underdogOutcome.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $addFields: {
          favoriteFoc: {
            $divide: [
              "$favIP",
              {
                $add: ["$favIP", "$underIp"],
              },
            ],
          },
          underdogFoc: {
            $divide: [
              "$underIp",
              {
                $add: ["$underIp", "$favIP"],
              },
            ],
          },
          favoriteFocOutcome: {
            $divide: [
              "$favIPOutcome",
              {
                $add: ["$favIPOutcome", "$underIpOutcome"],
              },
            ],
          },
          underdogFocOutcome: {
            $divide: [
              "$underIpOutcome",
              {
                $add: ["$underIpOutcome", "$favIPOutcome"],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          favRemovePoint: {
            $multiply: ["$favoriteFoc", 100],
          },
          favRemovePointOutcome: {
            $multiply: ["$favoriteFocOutcome", 100],
          },
        },
      },
      {
        $addFields: {
          favoriteOdd: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$favRemovePoint", "$underdogFoc"],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOdd: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFoc"],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
          favoriteOddOutcome: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        "$favRemovePointOutcome",
                        "$underdogFocOutcome",
                      ],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOddOutcome: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFocOutcome"],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
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
          goalServeLeagueId: true,
          awayTeam: {
            awayTeamName: "$awayTeam.name",
            awayTeamId: "$awayTeam._id",
            abbreviation: "$awayTeam.abbreviation",
            goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            awayTeamErrors: "$awayTeamError",
            won: "$awayTeamStandings.won",
            lose: "$awayTeamStandings.lost",
            teamImage: "$awayTeamImage.image",
            spread: "$odds.awayTeamSpread",
            moneyline: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            moneylineGoalServe: {
              $cond: [
                {
                  $gte: [
                    {
                      $toDouble: "$odds.awayTeamMoneyline.us",
                    },
                    0,
                  ],
                },
                {
                  $concat: ["+", "$odds.awayTeamMoneyline.us"],
                },
                "$odds.awayTeamMoneyline.us",
              ],
            },
            total: "$odds.awayTeamTotal",
          },
          homeTeam: {
            homeTeamName: "$homeTeam.name",
            homeTeamId: "$homeTeam._id",
            goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
            homeTeamRun: "$homeTeamTotalScore",
            abbreviation: "$homeTeam.abbreviation",
            homeTeamHit: "$homeTeamHit",
            homeTeamErrors: "$homeTeamError",
            won: "$homeTeamStandings.won",
            lose: "$homeTeamStandings.lost",
            teamImage: "$homeTeamImage.image",
            moneyline: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            moneylineGoalServe: {
              $cond: [
                {
                  $gte: [
                    {
                      $toDouble: "$odds.homeTeamMoneyline.us",
                    },
                    0,
                  ],
                },
                {
                  $concat: ["+", "$odds.homeTeamMoneyline.us"],
                },
                "$odds.homeTeamMoneyline.us",
              ],
            },
            spread: "$odds.homeTeamSpread",
            total: "$odds.homeTeamTotal",
          },
        },
      },
    ]);
    await socket("mlbUpcomingMatch", {
      getUpcomingMatch,
    });
  } catch (error: any) {
    console.log("error", error);
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
            abbreviation: "$awayTeam.abbreviation",
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
            abbreviation: "$homeTeam.abbreviation",
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
            {
              status: {
                $ne: "Delayed",
              },
            },
          ],
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
          from: "teamImages",
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
          status: { $concat: [{ $arrayElemAt: ["$inningNo", 1] }, " Inning"] },
          inningNo: {
            $last: "$inningNo",
          },
          datetime_utc: "$dateTimeUtc",
          time: true,
          goalServeMatchId: true,
          outs: {
            $cond: {
              if: { $eq: ["$outs", ""] },
              then: { $concat: ["0", " Out"] },
              else: {
                $concat: ["$outs", " Out"],
              },
            },
          },
          awayTeam: {
            awayTeamName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
            abbreviation: { $arrayElemAt: ["$teams.awayTeam.abbreviation", 0] },
            goalServeAwayTeamId: {
              $arrayElemAt: ["$teams.awayTeam.goalServeTeamId", 0],
            },
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            awayTeamErrors: "$awayTeamError",
            won: { $arrayElemAt: ["$standings.awayTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.awayTeam.lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
          },
          homeTeam: {
            homeTeamName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            abbreviation: { $arrayElemAt: ["$teams.homeTeam.abbreviation", 0] },
            goalServeHomeTeamId: {
              $arrayElemAt: ["$teams.homeTeam.goalServeTeamId", 0],
            },
            homeTeamRun: "$homeTeamTotalScore",
            homeTeamHit: "$homeTeamHit",
            homeTeamErrors: "$homeTeamError",
            won: { $arrayElemAt: ["$standings.homeTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.homeTeam.lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
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
  try {
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
          // formattedDate: 1,
          // time: 1,
          dateTimeUtc: 1,
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
            abbreviation: "$awayTeam.abbreviation",
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
            abbreviation: "$homeTeam.abbreviation",
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
          // formattedDate: 1,
          // time: 1,
          dateTimeUtc: 1,
        },
      },
      {
        $lookup: {
          from: "odds",
          let: { matchId: "$goalServeMatchId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$matchId", "$goalServeMatchId"] },
                    { $eq: ["$status", "Not Started"] },
                  ],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: "odds",
        },
      },
      {
        $addFields: {
          odds: {
            $arrayElemAt: ["$odds", 0],
          },
        },
      },

      {
        $addFields: {
          awayMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.awayTeamMoneyline.us"],
              },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          homeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.homeTeamMoneyline.us"],
              },
              "$odds.homeTeamMoneyline.us",
            ],
          },
        },
      },
      {
        $addFields: {
          isAwayTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
        },
      },
      {
        $addFields: {
          isAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "$isAwayTeamNagative"],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
        },
      },
      {
        $addFields: {
          favorite: {
            $cond: {
              if: {
                $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayMoneyline",
                          },
                          {
                            $toDouble: "$homeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeMoneyline",
                          },
                          {
                            $toDouble: "$awayMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          underdog: {
            $cond: {
              if: {
                $eq: ["$favorite.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayMoneyline" },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          favIP: {
            $multiply: [
              {
                $divide: [
                  "$favorite.moneyline",
                  {
                    $add: ["$favorite.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIp: {
            $multiply: [
              {
                $divide: [
                  100,
                  {
                    $add: ["$underdog.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $addFields: {
          favoriteFoc: {
            $divide: [
              "$favIP",
              {
                $add: ["$favIP", "$underIp"],
              },
            ],
          },
          underdogFoc: {
            $divide: [
              "$underIp",
              {
                $add: ["$underIp", "$favIP"],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          favRemovePoint: {
            $multiply: ["$favoriteFoc", 100],
          },
        },
      },
      {
        $addFields: {
          favoriteOdd: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$favRemovePoint", "$underdogFoc"],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOdd: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFoc"],
                    },
                    100,
                  ],
                },
                0,
              ],
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
          goalServeLeagueId: true,
          awayTeam: {
            abbreviation: "$awayTeam.abbreviation",
            awayTeamName: "$awayTeam.name",
            awayTeamId: "$awayTeam._id",
            goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            awayTeamErrors: "$awayTeamError",
            won: "$awayTeamStandings.won",
            lose: "$awayTeamStandings.lost",
            teamImage: "$awayTeamImage.image",
            spread: "$odds.awayTeamSpread",
            moneyline: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            moneylineGoalServe: {
              $cond: [
                {
                  $gte: [
                    {
                      $toDouble: "$odds.awayTeamMoneyline.us",
                    },
                    0,
                  ],
                },
                {
                  $concat: ["+", "$odds.awayTeamMoneyline.us"],
                },
                "$odds.awayTeamMoneyline.us",
              ],
            },
            total: "$odds.awayTeamTotal",
          },
          homeTeam: {
            abbreviation: "$homeTeam.abbreviation",
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
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            moneylineGoalServe: {
              $cond: [
                {
                  $gte: [
                    {
                      $toDouble: "$odds.homeTeamMoneyline.us",
                    },
                    0,
                  ],
                },
                {
                  $concat: ["+", "$odds.homeTeamMoneyline.us"],
                },
                "$odds.homeTeamMoneyline.us",
              ],
            },
            spread: "$odds.homeTeamSpread",
            total: "$odds.homeTeamTotal",
          },
        },
      },
    ]);

    return { getFinalMatch, getUpcomingMatch };
  } catch (error: any) {
    console.log("error", error);
  }
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
            player.positionType = item.name;
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
          positionType: eVal?.positionType,
        };
        const playerData = new Player(data);
        await playerData.save();
      });
    })
  );
};

const getFinalMatchDataFromDB = async (date1: string) => {
  const date2 = moment(date1).add(24, "hours").utc().toISOString();
  try {
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
        $sort: {
          // formattedDate: 1,
          // time: 1,
          dateTimeUtc: 1,
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
            abbreviation: "$awayTeam.abbreviation",
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
            abbreviation: "$homeTeam.abbreviation",
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
  } catch (error: any) {
    console.log("error", error);
  }
};
const getUpcomingDataFromMongodb = async (date1: string) => {
  let day = moment().format("D");
  let month = moment().format("MM");
  let year = moment().format("YYYY");
  let date = `${day}.${month}.${year}`;
  const date2 = moment(date1).add(24, "hours").utc().toISOString();
  try {
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
          let: { matchId: "$goalServeMatchId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$matchId", "$goalServeMatchId"] },
                    { $eq: ["$status", "Not Started"] },
                  ],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: "odds",
        },
      },
      {
        $addFields: {
          odds: {
            $arrayElemAt: ["$odds", 0],
          },
        },
      },
      {
        $addFields: {
          awayMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.awayTeamMoneyline.us"],
              },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          homeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.homeTeamMoneyline.us"],
              },
              "$odds.homeTeamMoneyline.us",
            ],
          },
        },
      },
      {
        $addFields: {
          isAwayTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
        },
      },
      {
        $addFields: {
          isAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "$isAwayTeamNagative"],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
        },
      },
      {
        $addFields: {
          favorite: {
            $cond: {
              if: {
                $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayMoneyline",
                          },
                          {
                            $toDouble: "$homeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeMoneyline",
                          },
                          {
                            $toDouble: "$awayMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          underdog: {
            $cond: {
              if: {
                $eq: ["$favorite.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayMoneyline" },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          favIP: {
            $multiply: [
              {
                $divide: [
                  "$favorite.moneyline",
                  {
                    $add: ["$favorite.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIp: {
            $multiply: [
              {
                $divide: [
                  100,
                  {
                    $add: ["$underdog.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $addFields: {
          favoriteFoc: {
            $divide: [
              "$favIP",
              {
                $add: ["$favIP", "$underIp"],
              },
            ],
          },
          underdogFoc: {
            $divide: [
              "$underIp",
              {
                $add: ["$underIp", "$favIP"],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          favRemovePoint: {
            $multiply: ["$favoriteFoc", 100],
          },
        },
      },
      {
        $addFields: {
          favoriteOdd: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$favRemovePoint", "$underdogFoc"],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOdd: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFoc"],
                    },
                    100,
                  ],
                },
                0,
              ],
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
          goalServeLeagueId: true,
          goalServeMatchId: true,
          awayTeam: {
            abbreviation: "$awayTeam.abbreviation",
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
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            moneylineGoalServe: {
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
            abbreviation: "$homeTeam.abbreviation",
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
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            moneylineGoalServe: {
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
  } catch (error: any) {
    console.log("error", error);
  }
};
const getLiveDataFromMongodb = async () => {
  try {
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
            {
              status: {
                $ne: "Delayed",
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
        $lookup: {
          from: "odds",
          localField: "goalServeMatchId",
          foreignField: "goalServeMatchId",
          as: "odds",
        },
      },
      {
        $addFields: {
          odds: {
            $arrayElemAt: ["$odds", 0],
          },
        },
      },
      {
        $addFields: {
          awayMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.awayTeamMoneyline.us"],
              },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          homeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.homeTeamMoneyline.us"],
              },
              "$odds.homeTeamMoneyline.us",
            ],
          },
        },
      },
      {
        $addFields: {
          isAwayTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
        },
      },
      {
        $addFields: {
          isAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "$isAwayTeamNagative"],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
        },
      },
      {
        $addFields: {
          favorite: {
            $cond: {
              if: {
                $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayMoneyline",
                          },
                          {
                            $toDouble: "$homeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeMoneyline",
                          },
                          {
                            $toDouble: "$awayMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          underdog: {
            $cond: {
              if: {
                $eq: ["$favorite.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayMoneyline" },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          favIP: {
            $multiply: [
              {
                $divide: [
                  "$favorite.moneyline",
                  {
                    $add: ["$favorite.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIp: {
            $multiply: [
              {
                $divide: [
                  100,
                  {
                    $add: ["$underdog.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $addFields: {
          favoriteFoc: {
            $divide: [
              "$favIP",
              {
                $add: ["$favIP", "$underIp"],
              },
            ],
          },
          underdogFoc: {
            $divide: [
              "$underIp",
              {
                $add: ["$underIp", "$favIP"],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          favRemovePoint: {
            $multiply: ["$favoriteFoc", 100],
          },
        },
      },
      {
        $addFields: {
          favoriteOdd: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$favRemovePoint", "$underdogFoc"],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOdd: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFoc"],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          id: true,
          date: true,
          status: { $concat: [{ $arrayElemAt: ["$inningNo", 1] }, " Inning"] },
          datetime_utc: "$dateTimeUtc",
          time: true,
          goalServeMatchId: true,
          outs: {
            $cond: {
              if: { $ne: ["$outs", ""] },
              then: { $concat: ["$outs", " Out"] },
              else: {
                $concat: ["0", " Out"],
              },
            },
          },
          awayTeam: {
            awayTeamName: "$awayTeam.name",
            awayTeamId: "$awayTeam._id",
            goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            abbreviation: "$awayTeam.abbreviation",
            awayTeamErrors: "$awayTeamError",
            won: "$awayTeamStandings.won",
            lose: "$awayTeamStandings.lost",
            teamImage: "$awayTeamImage.image",
            spread: "$odds.awayTeamSpread",
            moneyline: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            moneylineGoalServe: {
              $cond: [
                {
                  $gte: [
                    {
                      $toDouble: "$odds.awayTeamMoneyline.us",
                    },
                    0,
                  ],
                },
                {
                  $concat: ["+", "$odds.awayTeamMoneyline.us"],
                },
                "$odds.awayTeamMoneyline.us",
              ],
            },
            total: "$odds.awayTeamTotal",
          },
          homeTeam: {
            homeTeamName: "$homeTeam.name",
            goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
            homeTeamId: "$homeTeam._id",
            homeTeamRun: "$homeTeamTotalScore",
            homeTeamHit: "$homeTeamHit",
            abbreviation: "$homeTeam.abbreviation",
            homeTeamErrors: "$homeTeamError",
            won: "$homeTeamStandings.won",
            lose: "$homeTeamStandings.lost",
            teamImage: "$homeTeamImage.image",
            moneyline: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            moneylineGoalServe: {
              $cond: [
                {
                  $gte: [
                    {
                      $toDouble: "$odds.homeTeamMoneyline.us",
                    },
                    0,
                  ],
                },
                {
                  $concat: ["+", "$odds.homeTeamMoneyline.us"],
                },
                "$odds.homeTeamMoneyline.us",
              ],
            },
            spread: "$odds.homeTeamSpread",
            total: "$odds.homeTeamTotal",
          },
        },
      },
    ]);
  } catch (error: any) {
    console.log("error", error);
  }
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
          current_streak: team?.current_streak,
          games_back: team?.games_back,
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
  try {
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
          from: "teamImages",
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
                  team: "awayteam",
                  win: {
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
                      team: "hometeam",
                      win: {
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
                  team: "awayteam",
                  loss: {
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
                      team: "hometeam",
                      loss: {
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
                  team: "awayteam",
                  saves: {
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
                      team: "hometeam",
                      saves: {
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
                    },
                    else: null,
                  },
                },
              },
            },
          },
        },
      },

      {
        $lookup: {
          from: "odds",
          let: { matchId: "$goalServeMatchId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$matchId", "$goalServeMatchId"] },
                    { $eq: ["$status", "Not Started"] },
                  ],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: "odds",
        },
      },
      {
        $lookup: {
          from: "odds",
          let: { matchId: "$goalServeMatchId" },

          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$matchId", "$goalServeMatchId"] },
                    { $ne: ["$status", "Not Started"] },
                    { $ne: ["$status", "Postponed"] },
                    { $ne: ["$status", "Canceled"] },
                    { $ne: ["$status", "Suspended"] },
                  ],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: "outcome",
        },
      },
      {
        $addFields: {
          outcome: {
            $arrayElemAt: ["$outcome", 0],
          },
          odds: {
            $arrayElemAt: ["$odds", 0],
          },
        },
      },
      {
        $addFields: {
          awayMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.awayTeamMoneyline.us"],
              },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          homeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.homeTeamMoneyline.us"],
              },
              "$odds.homeTeamMoneyline.us",
            ],
          },
          awayOutcomeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$outcome.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$outcome.awayTeamMoneyline.us"],
              },
              "$outcome.awayTeamMoneyline.us",
            ],
          },
          homeOutcomeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$outcome.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$outcome.homeTeamMoneyline.us"],
              },
              "$outcome.homeTeamMoneyline.us",
            ],
          },
        },
      },
      {
        $addFields: {
          isAwayTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isAwayTeamOutcomeNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayOutcomeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamOutcomeNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeOutcomeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
        },
      },
      {
        $addFields: {
          isAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "$isAwayTeamNagative"],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
          isOutcomeAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      "$isHomeTeamOutcomeNagative",
                      "$isAwayTeamOutcomeNagative",
                    ],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamOutcomeNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamOutcomeNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
        },
      },
      {
        $addFields: {
          favorite: {
            $cond: {
              if: {
                $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayMoneyline",
                          },
                          {
                            $toDouble: "$homeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeMoneyline",
                          },
                          {
                            $toDouble: "$awayMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
          favoriteOutcome: {
            $cond: {
              if: {
                $eq: ["$isOutcomeAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayOutcomeMoneyline",
                          },
                          {
                            $toDouble: "$homeOutcomeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayOutcomeMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeOutcomeMoneyline",
                          },
                          {
                            $toDouble: "$awayOutcomeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeOutcomeMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamOutcomeNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayOutcomeMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeOutcomeMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          underdog: {
            $cond: {
              if: {
                $eq: ["$favorite.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayMoneyline" },
                },
              },
            },
          },
          underdogOutcome: {
            $cond: {
              if: {
                $eq: ["$favoriteOutcome.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeOutcomeMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayOutcomeMoneyline" },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          favIP: {
            $multiply: [
              {
                $divide: [
                  "$favorite.moneyline",
                  {
                    $add: ["$favorite.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIp: {
            $multiply: [
              {
                $divide: [
                  100,
                  {
                    $add: ["$underdog.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          favIPOutcome: {
            $multiply: [
              {
                $divide: [
                  "$favoriteOutcome.moneyline",
                  {
                    $add: ["$favoriteOutcome.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIpOutcome: {
            $multiply: [
              {
                $divide: [
                  "$underdogOutcome.moneyline",
                  {
                    $add: ["$underdogOutcome.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $addFields: {
          favoriteFoc: {
            $divide: [
              "$favIP",
              {
                $add: ["$favIP", "$underIp"],
              },
            ],
          },
          underdogFoc: {
            $divide: [
              "$underIp",
              {
                $add: ["$underIp", "$favIP"],
              },
            ],
          },
          favoriteFocOutcome: {
            $divide: [
              "$favIPOutcome",
              {
                $add: ["$favIPOutcome", "$underIpOutcome"],
              },
            ],
          },
          underdogFocOutcome: {
            $divide: [
              "$underIpOutcome",
              {
                $add: ["$underIpOutcome", "$favIPOutcome"],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          favRemovePoint: {
            $multiply: ["$favoriteFoc", 100],
          },
          favRemovePointOutcome: {
            $multiply: ["$favoriteFocOutcome", 100],
          },
        },
      },
      {
        $addFields: {
          favoriteOdd: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$favRemovePoint", "$underdogFoc"],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOdd: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFoc"],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
          favoriteOddOutcome: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [
                        "$favRemovePointOutcome",
                        "$underdogFocOutcome",
                      ],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOddOutcome: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFocOutcome"],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
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
          homeTeamTotalScore: true,
          awayTeamTotalScore: true,
          event: true,
          innings: {
            awayTeam: "$awayTeamInnings",
            homeTeam: "$homeTeamInnings",
          },

          hittingStatistics: {
            homeTeam: "$homeTeamHitters",
            awayTeam: "$awayTeamHitters",
          },
          pitchingStatistics: {
            awayTeam: "$awayTeamPitchers",
            homeTeam: "$homeTeamPitchers",
          },

          battingPlayerStatistics: {
            awayTeam: {
              $map: {
                input: "$awayTeamHitters",
                as: "item",
                in: {
                  home_runs: "$$item.home_runs",
                  average: "$$item.average",
                  runs: "$$item.runs",
                  goalServePlayerId: "$$item.id",
                  playerName: "$$item.name",
                  hits: "$$item.hits",
                  strikeouts: "$$item.strikeouts",
                  walks: "$$item.walks",
                  at_bats: "$$item.at_bats",
                  runs_batted_in: "$$item.runs_batted_in",
                },
              },
            },
            homeTeam: {
              $map: {
                input: "$homeTeamHitters",
                as: "item",
                in: {
                  home_runs: "$$item.home_runs",
                  average: "$$item.average",
                  runs: "$$item.runs",
                  goalServePlayerId: "$$item.id",
                  playerName: "$$item.name",
                  hits: "$$item.hits",
                  strikeouts: "$$item.strikeouts",
                  walks: "$$item.walks",
                  at_bats: "$$item.at_bats",
                  runs_batted_in: "$$item.runs_batted_in",
                },
              },
            },
          },
          awayTeam: {
            awayTeamFullName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
            abbreviation: { $arrayElemAt: ["$teams.awayTeam.abbreviation", 0] },
            awayTeamId: "$awayTeam._id",
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            awayTeamErrors: "$awayTeamError",
            teamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
            goalServeAwayTeamId: {
              $arrayElemAt: ["$teams.awayTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.awayTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.awayTeam.lost", 0] },
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
            abbreviation: { $arrayElemAt: ["$teams.homeTeam.abbreviation", 0] },
            homeTeamFullName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            homeTeamId: "$homeTeam._id",
            homeTeamRun: "$homeTeamTotalScore",
            homeTeamHit: "$homeTeamHit",
            homeTeamErrors: "$homeTeamError",
            teamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
            goalServeHomeTeamId: {
              $arrayElemAt: ["$teams.homeTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.homeTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.homeTeam.lost", 0] },
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
          pitchingResult: 1,
          scoring: {
            awayTeam: {
              hit: "$awayTeamHit",
              runs: "$awayTeamTotalScore",
              error: "$awayTeamError",
            },
            homeTeam: {
              hit: "$homeTeamHit",
              runs: "$homeTeamTotalScore",
              error: "$homeTeamError",
            },
          },
          closingOddsAndOutcome: {
            awayTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            awayTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.awayTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.awayTeamMoneyline.us"] },
                "$odds.awayTeamMoneyline.us",
              ],
            },
            homeTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            homeTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.homeTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.homeTeamMoneyline.us"] },
                "$odds.homeTeamMoneyline.us",
              ],
            },
            homeTeamSpreadObj: {
              homeTeamSpread: "$odds.homeTeamSpread",
              homeTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$odds.homeTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$odds.homeTeamSpreadUs"] },
                  "$odds.homeTeamSpreadUs",
                ],
              },
            },
            awayTeamSpreadObj: {
              awayTeamSpread: "$odds.awayTeamSpread",
              awayTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$odds.awayTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$odds.awayTeamSpreadUs"] },
                  "$odds.awayTeamSpreadUs",
                ],
              },
            },
            homeTeamTotal: "$odds.homeTeamTotal",
            awayTeamTotal: "$odds.awayTeamTotal",
          },
          outcome: {
            awayTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favoriteOutcome.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOddOutcome",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOddOutcome"],
                    },
                    else: "$favoriteOddOutcome",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOddOutcome",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOddOutcome"],
                    },
                    else: "$underdogOddOutcome",
                  },
                },
              },
            },
            homeTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favoriteOutcome.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOddOutcome",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOddOutcome"],
                    },
                    else: "$favoriteOddOutcome",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOddOutcome",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOddOutcome"],
                    },
                    else: "$underdogOddOutcome",
                  },
                },
              },
            },
            awayTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$outcome.awayTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$outcome.awayTeamMoneyline.us"] },
                "$outcome.awayTeamMoneyline.us",
              ],
            },
            homeTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$outcome.homeTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$outcome.homeTeamMoneyline.us"] },
                "$outcome.homeTeamMoneyline.us",
              ],
            },
            homeTeamSpreadObj: {
              homeTeamSpread: "$outcome.homeTeamSpread",
              homeTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$outcome.homeTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$outcome.homeTeamSpreadUs"] },
                  "$outcome.homeTeamSpreadUs",
                ],
              },
            },
            awayTeamSpreadObj: {
              awayTeamSpread: "$outcome.awayTeamSpread",
              awayTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$outcome.awayTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$outcome.awayTeamSpreadUs"] },
                  "$outcome.awayTeamSpreadUs",
                ],
              },
            },
            homeTeamTotal: "$outcome.homeTeamTotal",
            awayTeamTotal: "$outcome.awayTeamTotal",
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
  } catch (error: any) {
    console.log("error", error);
  }
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
  try {
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
  } catch (error: any) {
    console.log("error", error);
  }
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
  try {
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
          from: "teamImages",
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
          let: { matchId: "$goalServeMatchId", matchStatus: "$status" },

          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$matchId", "$goalServeMatchId"] },
                    { $eq: ["$status", "$$matchStatus"] },
                  ],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
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
        $lookup: {
          from: "players",
          let: {
            awayTeamStartingPictcherId: {
              $convert: {
                input:    "$startingPitchers.awayteam.player.id",
                to: "int",
                onError: 0, // Default value when conversion fails
              },
            
            },
            homeTeamStartingPictcherId: {
              $convert: {
                input: "$startingPitchers.hometeam.player.id",
                to: "int",
                onError: 0, // Default value when conversion fails
              },
    
            },
          },
          pipeline: [
            {
              $facet: {
                awayTeam: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$goalServePlayerId",
                          "$$awayTeamStartingPictcherId",
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      name: 1,
                      goalServePlayerId: 1,
                      pitching: 1,
                    },
                  },
                ],
                homeTeam: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$goalServePlayerId",
                          "$$homeTeamStartingPictcherId",
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      name: 1,
                      goalServePlayerId: 1,
                      pitching: 1,
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
          as: "startingPitchersPlayer",
        },
      },
      {
        $addFields: {
          awayMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.awayTeamMoneyline.us"],
              },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          homeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.homeTeamMoneyline.us"],
              },
              "$odds.homeTeamMoneyline.us",
            ],
          },
        },
      },
      {
        $addFields: {
          isAwayTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
        },
      },
      {
        $addFields: {
          isAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "$isAwayTeamNagative"],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
        },
      },
      {
        $addFields: {
          favorite: {
            $cond: {
              if: {
                $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayMoneyline",
                          },
                          {
                            $toDouble: "$homeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeMoneyline",
                          },
                          {
                            $toDouble: "$awayMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          underdog: {
            $cond: {
              if: {
                $eq: ["$favorite.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayMoneyline" },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          favIP: {
            $multiply: [
              {
                $divide: [
                  "$favorite.moneyline",
                  {
                    $add: ["$favorite.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIp: {
            $multiply: [
              {
                $divide: [
                  100,
                  {
                    $add: ["$underdog.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $addFields: {
          favoriteFoc: {
            $divide: [
              "$favIP",
              {
                $add: ["$favIP", "$underIp"],
              },
            ],
          },
          underdogFoc: {
            $divide: [
              "$underIp",
              {
                $add: ["$underIp", "$favIP"],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          favRemovePoint: {
            $multiply: ["$favoriteFoc", 100],
          },
        },
      },
      {
        $addFields: {
          favoriteOdd: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$favRemovePoint", "$underdogFoc"],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOdd: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFoc"],
                    },
                    100,
                  ],
                },
                0,
              ],
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
          goalServeMatchId:true,
          goalServeLeagueId:true,
          startingPitcher: {
            awayTeam: {
              wins: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.wins",
                  0,
                ],
              },
              losses: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.losses",
                  0,
                ],
              },
              playerName: {
                $arrayElemAt: ["$startingPitchersPlayer.awayTeam.name", 0],
              },
              earned_run_average: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.earned_run_average",
                  0,
                ],
              },
              walk_hits_per_inning_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.walk_hits_per_inning_pitched",
                  0,
                ],
              },
              innings_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.innings_pitched",
                  0,
                ],
              },
              hits: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.hits",
                  0,
                ],
              },
              strikeouts: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.strikeouts",
                  0,
                ],
              },
              walks: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.walks",
                  0,
                ],
              },
              home_runs: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.home_runs",
                  0,
                ],
              },
            },
            homeTeam: {
              wins: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.wins",
                  0,
                ],
              },
              losses: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.losses",
                  0,
                ],
              },
              playerName: {
                $arrayElemAt: ["$startingPitchersPlayer.homeTeam.name", 0],
              },
              earned_run_average: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.earned_run_average",
                  0,
                ],
              },
              walk_hits_per_inning_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.walk_hits_per_inning_pitched",
                  0,
                ],
              },
              innings_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.innings_pitched",
                  0,
                ],
              },
              hits: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.hits",
                  0,
                ],
              },
              strikeouts: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.strikeouts",
                  0,
                ],
              },
              walks: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.walks",
                  0,
                ],
              },
              home_runs: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.home_runs",
                  0,
                ],
              },
            },
          },
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
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            moneylineGoalServe: {
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
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            moneylineGoalServe: {
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

          battingPlayerStatistics: {
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
                      home_runs: "$$player.batting.home_runs",
                      batting_avg: "$$player.batting.batting_avg",
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
                      home_runs: "$$player.batting.home_runs",
                      batting_avg: "$$player.batting.batting_avg",
                    },
                  ],
                },
              },
            },
          },
          closingOddsAndOutcome: {
            awayTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            awayTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.awayTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.awayTeamMoneyline.us"] },
                "$odds.awayTeamMoneyline.us",
              ],
            },
            homeTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            homeTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.homeTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.homeTeamMoneyline.us"] },
                "$odds.homeTeamMoneyline.us",
              ],
            },
            homeTeamSpreadObj: {
              homeTeamSpread: "$odds.homeTeamSpread",
              homeTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$odds.homeTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$odds.homeTeamSpreadUs"] },
                  "$odds.homeTeamSpreadUs",
                ],
              },
            },
            awayTeamSpreadObj: {
              awayTeamSpread: "$odds.awayTeamSpread",
              awayTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$odds.awayTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$odds.awayTeamSpreadUs"] },
                  "$odds.awayTeamSpreadUs",
                ],
              },
            },
            homeTeamTotal: "$odds.homeTeamTotal",
            awayTeamTotal: "$odds.awayTeamTotal",
          },
        },
      },
    ]);
  
    return { getMatch: getMatch[0] };
  } catch (error: any) {
    console.log("error", error);
  }
};

const createOdds = async () => {
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
            parseInt(goalServeWinTeamId),
            "MLB"
          );
        }
      }
    }
  } catch (error: any) {
    console.log("error", error);
  }
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
          current_streak: team?.current_streak,
          games_back: team?.games_back,
          home_record: team.home_record,
          teamId: teamId?.id,
          goalServeTeamId: teamId?.goalServeTeamId,
          pct: +(
            Number(team.won) /
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
          { new: true, upsert: true }
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
        { new: true, upsert: true }
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
        { new: true, upsert: true }
      );
    })
  );
};
const updatePlayerStats = async () => {
  try {
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
              player.positionType = item.name;
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
            positionType: eVal?.positionType,
          };
          await Player.findOneAndUpdate(
            { goalServePlayerId: eVal.id },
            { $set: data },
            { new: true, upsert: true }
          );
        });
      })
    );
  } catch (error: any) {
    console.log("error", error);
  }
};

function findWinLoss(arr: any, goalServeTeamId: string) {
  let teamWins = 0;
  let teamLost = 0;
  for (const match of arr) {
    if (match.goalServeAwayTeamId === Number(goalServeTeamId)) {
      if (Number(match.awayTeamTotalScore) > Number(match.homeTeamTotalScore)) {
        teamWins++;
      } else if (
        Number(match.awayTeamTotalScore) < Number(match.homeTeamTotalScore)
      ) {
        teamLost++;
      }
    } else if (match.goalServeHomeTeamId === Number(goalServeTeamId)) {
      if (Number(match.homeTeamTotalScore) > Number(match.awayTeamTotalScore)) {
        teamWins++;
      } else if (
        Number(match.homeTeamTotalScore) < Number(match.awayTeamTotalScore)
      ) {
        teamLost++;
      }
    }
  }
  return `${teamWins}-${teamLost}`;
}
const mlbGetTeam = async (goalServeTeamId: string) => {
  try {
    const getTeam = await Standings.aggregate([
      {
        $match: {
          goalServeTeamId: Number(goalServeTeamId),
        },
      },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "matches",
          let: {
            goalServeTeamId: "$goalServeTeamId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        {
                          $eq: ["$goalServeAwayTeamId", "$$goalServeTeamId"],
                        },
                        {
                          $eq: ["$goalServeHomeTeamId", "$$goalServeTeamId"],
                        },
                      ],
                    },
                    {
                      $eq: ["$status", "Final"],
                    },
                  ],
                },
              },
            },
            {
              $sort: { dateUtc: -1 },
            },
            {
              $limit: 10,
            },
            {
              $project: {
                _id: 0, // Exclude the _id field if not needed
                dateUtc: 1,
                goalServeAwayTeamId: 1,
                goalServeHomeTeamId: 1,
                homeTeamTotalScore: 1,
                awayTeamTotalScore: 1,
              },
            },
          ],
          as: "lastMatches",
        },
      },
      {
        $lookup: {
          from: "standings",
          let: {
            parentDivision: "$division",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$division", "$$parentDivision"],
                },
              },
            },
            {
              $lookup: {
                from: "teamImages",
                localField: "goalServeTeamId",
                foreignField: "goalServeTeamId",
                as: "teamImage",
              },
            },

            {
              $lookup: {
                from: "matches",
                let: {
                  goalServeTeamId: "$goalServeTeamId",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          {
                            $or: [
                              {
                                $eq: [
                                  "$goalServeAwayTeamId",
                                  "$$goalServeTeamId",
                                ],
                              },
                              {
                                $eq: [
                                  "$goalServeHomeTeamId",
                                  "$$goalServeTeamId",
                                ],
                              },
                            ],
                          },
                          {
                            $eq: ["$status", "Final"],
                          },
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 0, // Exclude the _id field if not needed
                      dateUtc: 1,
                      goalServeAwayTeamId: 1,
                      goalServeHomeTeamId: 1,
                      homeTeamTotalScore: 1,
                      awayTeamTotalScore: 1,
                    },
                  },
                  {
                    $sort: { dateUtc: -1 },
                  },
                  {
                    $limit: 10,
                  },
                ],
                as: "lastMatches",
              },
            },

            {
              $project: {
                name: true,
                won: true,
                lost: true,
                games_back: true,
                away_record: true,
                home_record: true,
                goalServeTeamId: true,
                lastMatches: true,
                streak: "$current_streak",
                teamImage: { $arrayElemAt: ["$teamImage.image", 0] },
              },
            },
          ],
          as: "divisionStandings",
        },
      },
      {
        $lookup: {
          from: "injuries",
          let: {
            goalServeTeamId: "$goalServeTeamId",
          },

          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$goalServeTeamId", "$$goalServeTeamId"],
                },
              },
            },
            {
              $project: {
                date: 1,
                description: 1,
                goalServePlayerId: 1,
                playerName: 1,
                status: 1,
                goalServeTeamId: 1,
              },
            },
          ],
          as: "teamInjuredPlayers",
        },
      },
      {
        $lookup: {
          from: "players",
          let: {
            goalServeTeamId: "$goalServeTeamId",
          },

          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$goalServeTeamId", "$$goalServeTeamId"],
                },
              },
            },
            {
              $addFields: {
                hits: {
                  $toDouble: "$batting.hits",
                },
                home_runs: {
                  $toDouble: "$batting.home_runs",
                },
                batting_avg: {
                  $toDouble: "$batting.batting_avg",
                },
                runs_batted_in: {
                  $toDouble: "$batting.runs_batted_in",
                },
                on_base_percentage: {
                  $toDouble: "$batting.on_base_percentage",
                },
                wins: {
                  $toDouble: "$pitching.wins",
                },
                earned_run_average: {
                  $toDouble: "$pitching.earned_run_average",
                },
                strikeouts: {
                  $toDouble: "$pitching.strikeouts",
                },
                saves: {
                  $toDouble: "$pitching.saves",
                },
                holds: {
                  $toDouble: "$pitching.holds",
                },
              },
            },
            {
              $facet: {
                maxHits: [
                  {
                    $sort: {
                      hits: -1,
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
                maxHomeRun: [
                  {
                    $sort: {
                      home_runs: -1,
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
                maxOnBasePercentage: [
                  {
                    $sort: {
                      on_base_percentage: -1,
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
                maxRunsBattedIn: [
                  {
                    $sort: {
                      runs_batted_in: -1,
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
                maxBattingAvg: [
                  {
                    $sort: {
                      batting_avg: -1,
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
                maxHolds: [
                  {
                    $sort: {
                      holds: -1,
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
                maxSaves: [
                  {
                    $sort: {
                      saves: -1,
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
                maxStrikeouts: [
                  {
                    $sort: {
                      strikeouts: -1,
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
                maxEarnedRunAverage: [
                  {
                    $sort: {
                      earned_run_average: -1,
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
                maxWins: [
                  {
                    $sort: {
                      wins: -1,
                    },
                  },
                  {
                    $limit: 1,
                  },
                ],
              },
            },
            {
              $project: {
                maxHits: {
                  $arrayElemAt: ["$maxHits", 0],
                },
                maxHomeRun: {
                  $arrayElemAt: ["$maxHomeRun", 0],
                },
                maxBattingAvg: {
                  $arrayElemAt: ["$maxBattingAvg", 0],
                },
                maxRunsBattedIn: {
                  $arrayElemAt: ["$maxRunsBattedIn", 0],
                },
                maxOnBasePercentage: {
                  $arrayElemAt: ["$maxOnBasePercentage", 0],
                },
                maxHolds: {
                  $arrayElemAt: ["$maxHolds", 0],
                },
                maxSaves: {
                  $arrayElemAt: ["$maxSaves", 0],
                },
                maxStrikeouts: {
                  $arrayElemAt: ["$maxStrikeouts", 0],
                },
                maxEarnedRunAverage: {
                  $arrayElemAt: ["$maxEarnedRunAverage", 0],
                },

                maxWins: {
                  $arrayElemAt: ["$maxWins", 0],
                },
              },
            },
            {
              $project: {
                maxHomeRun: {
                  home_runs: "$maxHomeRun.home_runs",
                  name: "$maxHomeRun.name",
                  number: "$maxHomeRun.number",
                },
                maxHits: {
                  hits: "$maxHits.hits",
                  name: "$maxHits.name",
                  number: "$maxHits.number",
                },
                maxBattingAvg: {
                  batting_avg: "$maxBattingAvg.batting_avg",
                  name: "$maxBattingAvg.name",
                  number: "$maxBattingAvg.number",
                },
                maxRunsBattedIn: {
                  runs_batted_in: "$maxRunsBattedIn.runs_batted_in",
                  name: "$maxRunsBattedIn.name",
                  number: "$maxRunsBattedIn.number",
                },
                maxOnBasePercentage: {
                  on_base_percentage: "$maxOnBasePercentage.on_base_percentage",
                  name: "$maxOnBasePercentage.name",
                  number: "$maxOnBasePercentage.number",
                },
                maxHolds: {
                  holds: "$maxHolds.holds",
                  name: "$maxHolds.name",
                  number: "$maxHolds.number",
                },
                maxEarnedRunAverage: {
                  earned_run_average: "$maxEarnedRunAverage.earned_run_average",
                  name: "$maxEarnedRunAverage.name",
                  number: "$maxEarnedRunAverage.number",
                },
                maxSaves: {
                  saves: "$maxSaves.saves",
                  name: "$maxSaves.name",
                  number: "$maxSaves.number",
                },
                maxStrikeouts: {
                  strikeouts: "$maxStrikeouts.strikeouts",
                  name: "$maxStrikeouts.name",
                  number: "$maxStrikeouts.number",
                },

                maxWins: {
                  wins: "$maxWins.wins",
                  name: "$maxWins.name",
                  number: "$maxWins.number",
                },
              },
            },
          ],
          as: "teamLeaders",
        },
      },
      {
        $unwind: "$teamLeaders",
      },
      {
        $lookup: {
          from: "players",
          let: { goalServeTeamId: "$goalServeTeamId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$goalServeTeamId", "$$goalServeTeamId"],
                },
                // Add additional conditions if needed
              },
            },
            {
              $project: {
                _id: 0, // Exclude the _id field if not needed
                positionType: 1, // Include only the positionType field
                name: 1,
                pitching: 1,
                batting: 1,
                fielding: 1,
                height: 1,
                weight: 1,
                birthplace: 1,
                salary: 1,
                age: 1,
                bats: 1,
                throws: 1,
                position: 1,
                goalServePlayerId: 1,
                number: 1,
              },
            },
          ],
          as: "teamPlayers",
        },
      },
      {
        $addFields: {
          positions: {
            $setUnion: "$teamPlayers.positionType",
          },
        },
      },
      {
        $lookup: {
          from: "matches",
          let: {
            goalServeTeamId: "$goalServeTeamId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        {
                          $eq: ["$goalServeAwayTeamId", "$$goalServeTeamId"],
                        },
                        {
                          $eq: ["$goalServeHomeTeamId", "$$goalServeTeamId"],
                        },
                      ],
                    },
                    {
                      $eq: ["$status", "Final"],
                    },
                  ],
                },
              },
            },

            {
              $addFields: {
                opposingTeamId: {
                  $cond: {
                    if: {
                      $eq: ["$goalServeAwayTeamId", "$$goalServeTeamId"],
                    },
                    then: "$goalServeHomeTeamId",
                    else: "$goalServeAwayTeamId",
                  },
                },
              },
            },
            {
              $addFields: {
                dateUtc: {
                  $dateFromString: {
                    dateString: "$dateTimeUtc",
                    timezone: "UTC",
                  },
                },
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
                goalServeAwayTeamId: 1,
                goalServeHomeTeamId: 1,
                dateUtc: 1,
                awayTeamTotalScore: 1,
                homeTeamTotalScore: 1,
                goalServeMatchId: 1,
                date: 1,
                startingPitchers: 1,
                dateTimeUtc: 1,
                homeTeamTotalScoreInNumber: 1,
                awayTeamTotalScoreInNumber: 1,
                opposingTeamId: 1,
              },
            },
            {
              $sort: {
                dateUtc: -1,
              },
            },
            {
              $limit: 5,
            },
            {
              $lookup: {
                from: "teams",
                let: {
                  opposingTeamId: "$opposingTeamId",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$goalServeTeamId", "$$opposingTeamId"],
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
                  {
                    $lookup: {
                      from: "teamImages",
                      let: {
                        opposingTeamId: "$$opposingTeamId",
                      },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: ["$goalServeTeamId", "$$opposingTeamId"],
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
                      as: "opposingTeamImage",
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      goalServeTeamId: 1,
                      name: 1,
                      abbreviation: 1,
                      opposingTeamImage: {
                        $arrayElemAt: ["$opposingTeamImage.image", 0],
                      },
                    },
                  },
                ],
                as: "opposingTeam",
              },
            },
            {
              $lookup: {
                from: "odds",
                let: {
                  matchId: "$goalServeMatchId",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$goalServeMatchId", "$$matchId"],
                      },
                    },
                  },
                  {
                    $project: {
                      spread: {
                        $cond: {
                          if: {
                            $eq: ["$goalServeHomeTeamId", "$goalServeTeamId"],
                          },
                          then: "$homeTeamSpread",
                          else: "$awayTeamSpread",
                        },
                      },
                      total: {
                        $cond: {
                          if: {
                            $eq: ["$goalServeHomeTeamId", "$goalServeTeamId"],
                          },
                          then: "$homeTeamTotal",
                          else: "$awayTeamTotal",
                        },
                      },
                    },
                  },
                ],
                as: "odds",
              },
            },
          ],
          as: "schedule",
        },
      },
      {
        $project: {
          id: true,
          goalServeTeamId: true,
          teamImage: "$images.image",
          name: true,
          lastMatches: true,
          streak: "$current_streak",
          division: true,
          position: true,
          won: true,
          lost: true,
          playerStatistics: {
            playerBattingStats: {
              $map: {
                input: {
                  $filter: {
                    input: "$teamPlayers",
                    as: "item",
                    cond: {
                      $and: [
                        { $ne: ["$$item.batting", null] },
                        { $ne: [{ $type: "$$item.batting" }, "missing"] },
                      ],
                    },
                  },
                },
                as: "item",
                in: {
                  name: "$$item.name",
                  games_played: "$$item.batting.games_played",
                  batting_avg: "$$item.batting.batting_avg",
                  at_bats: "$$item.batting.at_bats",
                  walks: "$$item.batting.walks",
                  hits: "$$item.batting.hits",
                  runs: "$$item.batting.runs",
                  triples: "$$item.batting.triples",
                  doubles: "$$item.batting.doubles",
                  home_runs: "$$item.batting.home_runs",
                  runs_batted_in: "$$item.batting.runs_batted_in",
                  total_bases: "$$item.batting.total_bases",
                  stolen_bases: "$$item.batting.stolen_bases",
                  strikeouts: "$$item.batting.strikeouts",
                  on_base_percentage: "$$item.batting.on_base_percentage",
                  goalServePlayerId: "$$item.goalServePlayerId",
                  slugging_percentage: "$$item.batting.slugging_percentage",
                  on_base_plus_slugging: {
                    $round: [
                      {
                        $sum: [
                          {
                            $toDouble: "$$item.batting.on_base_percentage",
                          },
                          {
                            $toDouble: "$$item.batting.slugging_percentage",
                          },
                        ],
                      },
                      3,
                    ],
                  },
                },
              },
            },
            playerPitchingStats: {
              $map: {
                input: {
                  $filter: {
                    input: "$teamPlayers",
                    as: "item",
                    cond: {
                      $and: [
                        { $ne: ["$$item.pitching", null] },
                        { $ne: [{ $type: "$$item.pitching" }, "missing"] },
                      ],
                    },
                  },
                },
                as: "item",
                in: {
                  name: "$$item.name",
                  goalServePlayerId: "$$item.goalServePlayerId",
                  games_played: "$$item.pitching.games_played",
                  games_started: "$$item.pitching.games_started",
                  quality_starts: "$$item.pitching.quality_starts",
                  wins: "$$item.pitching.wins",
                  losses: "$$item.pitching.losses",
                  saves: "$$item.pitching.saves",
                  holds: "$$item.pitching.holds",
                  innings_pitched: "$$item.pitching.innings_pitched",
                  hits: "$$item.pitching.hits",
                  earned_runs: "$$item.pitching.earned_runs",
                  home_runs: "$$item.pitching.home_runs",
                  walks: "$$item.pitching.walks",
                  strikeouts: "$$item.pitching.strikeouts",
                  strikeouts_per_9_innings:
                    "$$item.pitching.strikeouts_per_9_innings",
                  pitches_per_start: "$$item.pitching.pitches_per_start",
                  walk_hits_per_inning_pitched:
                    "$$item.pitching.walk_hits_per_inning_pitched",
                },
              },
            },
            playerFieldingStats: {
              $map: {
                input: {
                  $filter: {
                    input: "$teamPlayers",
                    as: "item",
                    cond: {
                      $and: [
                        { $ne: ["$$item.fielding", null] },
                        { $ne: [{ $type: "$$item.fielding" }, "missing"] },
                      ],
                    },
                  },
                },
                as: "item",
                in: {
                  name: "$$item.name",
                  goalServePlayerId: "$$item.goalServePlayerId",
                  games_played: "$$item.fielding.games_played",
                  games_started: "$$item.fielding.games_started",
                  full_innings: "$$item.fielding.full_innings",
                  total_chances: "$$item.fielding.total_chances",
                  fielding_percentage: "$$item.fielding.fielding_percentage",
                  putouts: "$$item.fielding.putouts",
                  assists: "$$item.fielding.assists",
                  range_factor: "$$item.fielding.range_factor",
                  errors: "$$item.fielding.errors",
                  double_plays: "$$item.fielding.double_plays",
                },
              },
            },
          },
          teamLeaders: {
            teamLeaderBatting: {
              maxBattingAvg: "$teamLeaders.maxBattingAvg",
              maxRunsBattedIn: "$teamLeaders.maxRunsBattedIn",
              maxHits: "$teamLeaders.maxHits",
              maxOnBasePercentage: "$teamLeaders.maxOnBasePercentage",
              maxHomeRun: "$teamLeaders.maxHomeRun",
            },
            teamLeadersPitching: {
              maxWins: "$teamLeaders.maxWins",
              maxStrikeouts: "$teamLeaders.maxStrikeouts",
              maxSaves: "$teamLeaders.maxSaves",
              maxEarnedRunAverage: "$teamLeaders.maxEarnedRunAverage",
              maxHolds: "$teamLeaders.maxHolds",
            },
          },
          roaster: {
            $map: {
              input: "$positions",
              as: "pos",
              in: {
                position: "$$pos",
                players: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$teamPlayers",
                        as: "player",
                        cond: {
                          $eq: ["$$player.positionType", "$$pos"],
                        },
                      },
                    },
                    as: "player",
                    in: {
                      name: "$$player.name",
                      height: "$$player.height",
                      weight: "$$player.weight",
                      birthplace: "$$player.birth_place",
                      salary: "$$player.salarycap",
                      age: "$$player.age",
                      bats: "$$player.bats",
                      throws: "$$player.throws",
                      position: "$$player.position",
                      goalServePlayerId: "$$player.goalServePlayerId",
                      number: "$$player.number",
                    },
                  },
                },
              },
            },
          },
          teamDetails: {
            divisionStandings: "$divisionStandings",
            teamLeaders: {
              maxBattingAvg: "$teamLeaders.maxBattingAvg",
              maxRunsBattedIn: "$teamLeaders.maxRunsBattedIn",
              maxHits: "$teamLeaders.maxHits",
            },
            teamInjuredPlayers: {
              $map: {
                input: "$teamInjuredPlayers",
                as: "item",
                in: {
                  date: "$$item.date",
                  description: "$$item.description",
                  goalServePlayerId: "$$item.goalServePlayerId",
                  playerName: "$$item.playerName",
                  status: "$$item.status",
                  goalServeTeamId: "$$item.goalServeTeamId",
                },
              },
            },

            matches: {
              $map: {
                input: "$schedule",
                as: "item",
                in: {
                  isWinner: {
                    $cond: {
                      if: {
                        $eq: ["$$item.goalServeAwayTeamId", "$goalServeTeamId"],
                      },
                      then: {
                        $cond: {
                          if: {
                            $gte: [
                              "$$item.homeTeamTotalScoreInNumber",
                              "$$item.awayTeamTotalScoreInNumber",
                            ],
                          },
                          then: "L",
                          else: "W",
                        },
                      },
                      else: {
                        $cond: {
                          if: {
                            $gte: [
                              "$$item.homeTeamTotalScoreInNumber",
                              "$$item.awayTeamTotalScoreInNumber",
                            ],
                          },
                          then: "w",
                          else: "L",
                        },
                      },
                    },
                  },
                  pitcher: {
                    $cond: {
                      if: {
                        $eq: ["$goalServeTeamId", "$$item.goalServeAwayTeamId"],
                      },
                      then: "$$item.startingPitchers.awayteam.player.name",
                      else: "$$item.startingPitchers.hometeam.player.name",
                    },
                  },
                  oppositePitcher: {
                    $cond: {
                      if: {
                        $eq: ["$goalServeTeamId", "$$item.goalServeAwayTeamId"],
                      },
                      then: "$$item.startingPitchers.hometeam.player.name",
                      else: "$$item.startingPitchers.awayteam.player.name",
                    },
                  },
                  goalServeTeamId: "$$item.goalServeTeamId",
                  opposingTeam: {
                    $arrayElemAt: ["$$item.opposingTeam", 0],
                  },
                  oppositeTeamId: "$$item.oppositeTeamId",
                  odds: { $arrayElemAt: ["$$item.odds", 0] },
                  goalServeMatchId: "$$item.goalServeMatchId",
                  date: "$$item.date",
                  awayTeamTotalScore: "$$item.awayTeamTotalScore",
                  homeTeamTotalScore: "$$item.homeTeamTotalScore",
                  goalServeHomeTeamId: "$$item.goalServeHomeTeamId",
                  goalServeAwayTeamId: "$$item.goalServeAwayTeamId",
                },
              },
            },
          },
        },
      },
    ]);
    let standingData = await getStandingData();

    getTeam[0].last_ten = findWinLoss(getTeam[0].lastMatches, goalServeTeamId);

    delete getTeam[0].lastMatches;
    getTeam[0].teamDetails.divisionStandings.map((item: any) => {
      item.last_ten = findWinLoss(item.lastMatches, item.goalServeTeamId);

      delete item.lastMatches;
    });
    getTeam[0].teamStandings = standingData;
    return getTeam[0];
  } catch (error: any) {
    console.log("error", error);
  }
};

const mlbSingleGameBoxScoreLive = async (goalServeMatchId: string) => {
  try {
    const getMatchData = await Match.aggregate([
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
          from: "teamImages",
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
                      walks: 1,
                      strikeouts: 1,
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
                      walks: 1,
                      strikeouts: 1,
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
          from: "players",
          let: {
            awayTeamStartingPictcherId: {
              $convert: {
                input:    "$startingPitchers.awayteam.player.id",
                to: "int",
                onError: 0, // Default value when conversion fails
              },
            
            },
            homeTeamStartingPictcherId: {
              $convert: {
                input: "$startingPitchers.hometeam.player.id",
                to: "int",
                onError: 0, // Default value when conversion fails
              },
            },
          },
          pipeline: [
            {
              $facet: {
                awayTeam: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$goalServePlayerId",
                          "$$awayTeamStartingPictcherId",
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      name: 1,
                      goalServePlayerId: 1,
                      pitching: 1,
                    },
                  },
                ],
                homeTeam: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$goalServePlayerId",
                          "$$homeTeamStartingPictcherId",
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      name: 1,
                      goalServePlayerId: 1,
                      pitching: 1,
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
          as: "startingPitchersPlayer",
        },
      },
      {
        $addFields: {
          inningNo: {
            $split: ["$status", " "],
          },

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
        $lookup: {
          from: "odds",
          let: { matchId: "$goalServeMatchId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$matchId", "$goalServeMatchId"] },
                    { $eq: ["$status", "Not Started"] },
                  ],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: "odds",
        },
      },
      {
        $lookup: {
          from: "odds",
          let: { matchId: "$goalServeMatchId" },

          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$matchId", "$goalServeMatchId"] },
                    { $ne: ["$status", "Not Started"] },
                    { $ne: ["$status", "Final"] },
                    { $ne: ["$status", "Postponed"] },
                    { $ne: ["$status", "Canceled"] },
                    { $ne: ["$status", "Suspended"] },
                  ],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: "liveOdds",
        },
      },
      {
        $addFields: {
          liveOdds: {
            $arrayElemAt: ["$liveOdds", 0],
          },
          odds: {
            $arrayElemAt: ["$odds", 0],
          },
        },
      },
      {
        $addFields: {
          awayMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.awayTeamMoneyline.us"],
              },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          homeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.homeTeamMoneyline.us"],
              },
              "$odds.homeTeamMoneyline.us",
            ],
          },
          awayLiveMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$liveOdds.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$liveOdds.awayTeamMoneyline.us"],
              },
              "$liveOdds.awayTeamMoneyline.us",
            ],
          },
          homeLiveMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$liveOdds.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$liveOdds.homeTeamMoneyline.us"],
              },
              "$liveOdds.homeTeamMoneyline.us",
            ],
          },
        },
      },
      {
        $addFields: {
          isAwayTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isAwayTeamLiveNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayLiveMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamLiveNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeLiveMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
        },
      },
      {
        $addFields: {
          isAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "$isAwayTeamNagative"],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
          isLiveAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$isHomeTeamLiveNagative", "$isAwayTeamLiveNagative"],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamLiveNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamLiveNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
        },
      },
      {
        $addFields: {
          favorite: {
            $cond: {
              if: {
                $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayMoneyline",
                          },
                          {
                            $toDouble: "$homeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeMoneyline",
                          },
                          {
                            $toDouble: "$awayMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
          favoriteLive: {
            $cond: {
              if: {
                $eq: ["$isLiveAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayLiveMoneyline",
                          },
                          {
                            $toDouble: "$homeLiveMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayLiveMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeLiveMoneyline",
                          },
                          {
                            $toDouble: "$awayLiveMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeLiveMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamLiveNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayLiveMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeLiveMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          underdog: {
            $cond: {
              if: {
                $eq: ["$favorite.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayMoneyline" },
                },
              },
            },
          },
          underdogLive: {
            $cond: {
              if: {
                $eq: ["$favoriteLive.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeLiveMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayLiveMoneyline" },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          favIP: {
            $multiply: [
              {
                $divide: [
                  "$favorite.moneyline",
                  {
                    $add: ["$favorite.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIp: {
            $multiply: [
              {
                $divide: [
                  100,
                  {
                    $add: ["$underdog.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          favIPLive: {
            $multiply: [
              {
                $divide: [
                  "$favoriteLive.moneyline",
                  {
                    $add: ["$favoriteLive.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIpLive: {
            $multiply: [
              {
                $divide: [
                  "$underdogLive.moneyline",
                  {
                    $add: ["$underdogLive.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $addFields: {
          favoriteFoc: {
            $divide: [
              "$favIP",
              {
                $add: ["$favIP", "$underIp"],
              },
            ],
          },
          underdogFoc: {
            $divide: [
              "$underIp",
              {
                $add: ["$underIp", "$favIP"],
              },
            ],
          },
          favoriteFocLive: {
            $divide: [
              "$favIPLive",
              {
                $add: ["$favIPLive", "$underIpLive"],
              },
            ],
          },
          underdogFocLive: {
            $divide: [
              "$underIpLive",
              {
                $add: ["$underIpLive", "$favIPLive"],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          favRemovePoint: {
            $multiply: ["$favoriteFoc", 100],
          },
          favRemovePointLive: {
            $multiply: ["$favoriteFocLive", 100],
          },
        },
      },
      {
        $addFields: {
          favoriteOdd: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$favRemovePoint", "$underdogFoc"],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOdd: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFoc"],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
          favoriteOddLive: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$favRemovePointLive", "$underdogFocLive"],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOddLive: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFocLive"],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          id: 1,
          attendance: 1,
          venueName: 1,
          goalServeMatchId: 1,
          event: true,
          outs: {
            $cond: {
              if: { $ne: ["$outs", ""] },
              then: { $concat: ["$outs", " Out"] },
              else: {
                $concat: ["0", " Out"],
              },
            },
          },
          inningNo: { $arrayElemAt: ["$inningNo", 1] },
          timer: "$timer",
          datetime_utc: "$dateTimeUtc",
          homeTeamTotalScore: "$homeTeamTotalScore",
          awayTeamTotalScore: "$awayTeamTotalScore",
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
          innings: {
            awayTeam: "$awayTeamInnings",
            homeTeam: "$homeTeamInnings",
          },
          awayTeam: {
            awayTeamName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            awayTeamErrors: "$awayTeamError",
            goalServeAwayTeamId: {
              $arrayElemAt: ["$teams.awayTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.awayTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.awayTeam.lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
          },
          homeTeam: {
            homeTeamName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            goalServeHomeTeamId: {
              $arrayElemAt: ["$teams.homeTeam.goalServeTeamId", 0],
            },
            homeTeamRun: "$homeTeamTotalScore",
            homeTeamHit: "$homeTeamHit",
            homeTeamErrors: "$homeTeamError",
            won: { $arrayElemAt: ["$standings.homeTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.homeTeam.lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
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
          teamStatistic: {
            homeTeam: {
              walks: {
                $arrayElemAt: ["$statsTeams.homeTeam.walks", 0],
              },
              strikeouts: {
                $arrayElemAt: ["$statsTeams.homeTeam.strikeouts", 0],
              },
              batting_avg: {
                $arrayElemAt: ["$statsTeams.homeTeam.batting_avg", 0],
              },
              hits: { $arrayElemAt: ["$statsTeams.homeTeam.hits", 0] },
              runs: { $arrayElemAt: ["$statsTeams.homeTeam.runs", 0] },
              on_base_percentage: {
                $arrayElemAt: ["$statsTeams.homeTeam.on_base_percentage", 0],
              },
              slugging_percentage: {
                $arrayElemAt: ["$statsTeams.homeTeam.slugging_percentage", 0],
              },
              on_base_plus_slugging: {
                $round: [
                  {
                    $sum: [
                      {
                        $toDouble: {
                          $arrayElemAt: [
                            "$statsTeams.homeTeam.on_base_percentage",
                            0,
                          ],
                        },
                      },
                      {
                        $toDouble: {
                          $arrayElemAt: [
                            "$statsTeams.homeTeam.slugging_percentage",
                            0,
                          ],
                        },
                      },
                    ],
                  },
                  3,
                ],
              },
              runs_batted_in: {
                $arrayElemAt: ["$statsTeams.homeTeam.runs_batted_in", 0],
              },
            },
            awayTeam: {
              walks: {
                $arrayElemAt: ["$statsTeams.awayTeam.walks", 0],
              },
              strikeouts: {
                $arrayElemAt: ["$statsTeams.awayTeam.strikeouts", 0],
              },
              batting_avg: {
                $arrayElemAt: ["$statsTeams.awayTeam.batting_avg", 0],
              },
              hits: { $arrayElemAt: ["$statsTeams.awayTeam.hits", 0] },
              runs: { $arrayElemAt: ["$statsTeams.awayTeam.runs", 0] },
              on_base_percentage: {
                $arrayElemAt: ["$statsTeams.awayTeam.on_base_percentage", 0],
              },
              slugging_percentage: {
                $arrayElemAt: ["$statsTeams.awayTeam.slugging_percentage", 0],
              },
              on_base_plus_slugging: {
                $round: [
                  {
                    $sum: [
                      {
                        $toDouble: {
                          $arrayElemAt: [
                            "$statsTeams.awayTeam.on_base_percentage",
                            0,
                          ],
                        },
                      },
                      {
                        $toDouble: {
                          $arrayElemAt: [
                            "$statsTeams.awayTeam.slugging_percentage",
                            0,
                          ],
                        },
                      },
                    ],
                  },
                  3,
                ],
              },
              runs_batted_in: {
                $arrayElemAt: ["$statsTeams.awayTeam.runs_batted_in", 0],
              },
            },
          },
          startingPitcher: {
            awayTeam: {
              wins: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.wins",
                  0,
                ],
              },
              losses: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.losses",
                  0,
                ],
              },
              playerName: {
                $arrayElemAt: ["$startingPitchersPlayer.awayTeam.name", 0],
              },
              earned_run_average: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.earned_run_average",
                  0,
                ],
              },
              walk_hits_per_inning_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.walk_hits_per_inning_pitched",
                  0,
                ],
              },
              innings_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.innings_pitched",
                  0,
                ],
              },
              hits: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.hits",
                  0,
                ],
              },
              strikeouts: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.strikeouts",
                  0,
                ],
              },
              walks: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.walks",
                  0,
                ],
              },
              home_runs: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.home_runs",
                  0,
                ],
              },
            },
            homeTeam: {
              wins: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.wins",
                  0,
                ],
              },
              losses: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.losses",
                  0,
                ],
              },
              playerName: {
                $arrayElemAt: ["$startingPitchersPlayer.homeTeam.name", 0],
              },
              earned_run_average: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.earned_run_average",
                  0,
                ],
              },
              walk_hits_per_inning_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.walk_hits_per_inning_pitched",
                  0,
                ],
              },
              innings_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.innings_pitched",
                  0,
                ],
              },
              hits: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.hits",
                  0,
                ],
              },
              strikeouts: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.strikeouts",
                  0,
                ],
              },
              walks: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.walks",
                  0,
                ],
              },
              home_runs: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.home_runs",
                  0,
                ],
              },
            },
          },
          battingPlayerStatistics: {
            awayTeam: {
              $map: {
                input: "$awayTeamHitters",
                as: "item",
                in: {
                  home_runs: "$$item.home_runs",
                  average: "$$item.average",
                  runs: "$$item.runs",
                  goalServePlayerId: "$$item.id",
                  playerName: "$$item.name",
                  hits: "$$item.hits",
                  strikeouts: "$$item.strikeouts",
                  walks: "$$item.walks",
                  at_bats: "$$item.at_bats",
                  runs_batted_in: "$$item.runs_batted_in",
                },
              },
            },
            homeTeam: {
              $map: {
                input: "$homeTeamHitters",
                as: "item",
                in: {
                  home_runs: "$$item.home_runs",
                  average: "$$item.average",
                  runs: "$$item.runs",
                  goalServePlayerId: "$$item.id",
                  playerName: "$$item.name",
                  hits: "$$item.hits",
                  strikeouts: "$$item.strikeouts",
                  walks: "$$item.walks",
                  at_bats: "$$item.at_bats",
                  runs_batted_in: "$$item.runs_batted_in",
                },
              },
            },
          },
          scoring: {
            awayTeam: {
              hit: "$awayTeamHit",
              runs: "$awayTeamTotalScore",
              error: "$awayTeamError",
            },
            homeTeam: {
              hit: "$homeTeamHit",
              runs: "$homeTeamTotalScore",
              error: "$homeTeamError",
            },
          },
          closingOddsAndOutcome: {
            awayTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            homeTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            awayTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.awayTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.awayTeamMoneyline.us"] },
                "$odds.awayTeamMoneyline.us",
              ],
            },
            homeTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.homeTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.homeTeamMoneyline.us"] },
                "$odds.homeTeamMoneyline.us",
              ],
            },
            homeTeamSpreadObj: {
              homeTeamSpread: "$odds.homeTeamSpread",
              homeTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$odds.homeTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$odds.homeTeamSpreadUs"] },
                  "$odds.homeTeamSpreadUs",
                ],
              },
            },
            awayTeamSpreadObj: {
              awayTeamSpread: "$odds.awayTeamSpread",
              awayTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$odds.awayTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$odds.awayTeamSpreadUs"] },
                  "$odds.awayTeamSpreadUs",
                ],
              },
            },
            homeTeamTotal: "$odds.homeTeamTotal",
            awayTeamTotal: "$odds.awayTeamTotal",
          },
          liveOdds: {
            awayTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favoriteLive.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOddLive",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOddLive"],
                    },
                    else: "$favoriteOddLive",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOddLive",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOddLive"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            homeTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favoriteLive.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOddLive",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOddLive"],
                    },
                    else: "$favoriteOddLive",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOddLive",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOddLive"],
                    },
                    else: "$underdogOddLive",
                  },
                },
              },
            },
            awayTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$liveOdds.awayTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$liveOdds.awayTeamMoneyline.us"] },
                "$liveOdds.awayTeamMoneyline.us",
              ],
            },
            homeTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$liveOdds.homeTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$liveOdds.homeTeamMoneyline.us"] },
                "$liveOdds.homeTeamMoneyline.us",
              ],
            },
            homeTeamSpreadObj: {
              homeTeamSpread: "$liveOdds.homeTeamSpread",
              homeTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$liveOdds.homeTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$liveOdds.homeTeamSpreadUs"] },
                  "$liveOdds.homeTeamSpreadUs",
                ],
              },
            },
            awayTeamSpreadObj: {
              awayTeamSpread: "$liveOdds.awayTeamSpread",
              awayTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$liveOdds.awayTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$liveOdds.awayTeamSpreadUs"] },
                  "$liveOdds.awayTeamSpreadUs",
                ],
              },
            },
            homeTeamTotal: "$liveOdds.homeTeamTotal",
            awayTeamTotal: "$liveOdds.awayTeamTotal",
          },
        },
      },
    ]);
    const string = getMatchData[0]?.inningNo;
    const number = parseInt(string?.replace(/\D/g, ""));
    let getMatch = getMatchData[0];
    if (getMatch) getMatch.status = number ? `Inning ${number}` : "";
    return { getMatch };
  } catch (error: any) {
    console.log("error", error);
  }
};

const liveBoxscoreMlb = async () => {
  try {
    const getMatch = await Match.aggregate([
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
            {
              status: {
                $ne: "Delayed",
              },
            },
          ],
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
          from: "teamImages",
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
                      walks: 1,
                      strikeouts: 1,
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
                      walks: 1,
                      strikeouts: 1,
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
          from: "players",
          let: {
            awayTeamStartingPictcherId: {
              $convert: {
                input:    "$startingPitchers.awayteam.player.id",
                to: "int",
                onError: 0, // Default value when conversion fails
              },
            
            },
            homeTeamStartingPictcherId: {
              $convert: {
                input: "$startingPitchers.hometeam.player.id",
                to: "int",
                onError: 0, // Default value when conversion fails
              },
            }
          },
          pipeline: [
            {
              $facet: {
                awayTeam: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$goalServePlayerId",
                          "$$awayTeamStartingPictcherId",
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      name: 1,
                      goalServePlayerId: 1,
                      pitching: 1,
                    },
                  },
                ],
                homeTeam: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$goalServePlayerId",
                          "$$homeTeamStartingPictcherId",
                        ],
                      },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      name: 1,
                      goalServePlayerId: 1,
                      pitching: 1,
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
          as: "startingPitchersPlayer",
        },
      },
      {
        $addFields: {
          inningNo: {
            $split: ["$status", " "],
          },
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
        $lookup: {
          from: "odds",
          let: { matchId: "$goalServeMatchId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$matchId", "$goalServeMatchId"] },
                    { $eq: ["$status", "Not Started"] },
                  ],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: "odds",
        },
      },
      {
        $lookup: {
          from: "odds",
          let: { matchId: "$goalServeMatchId" },

          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$$matchId", "$goalServeMatchId"] },
                    { $ne: ["$status", "Not Started"] },
                    { $ne: ["$status", "Final"] },
                    { $ne: ["$status", "Postponed"] },
                    { $ne: ["$status", "Canceled"] },
                    { $ne: ["$status", "Suspended"] },
                  ],
                },
              },
            },
            { $sort: { updatedAt: -1 } },
            { $limit: 1 },
          ],
          as: "liveOdds",
        },
      },
      {
        $addFields: {
          liveOdds: {
            $arrayElemAt: ["$liveOdds", 0],
          },
          odds: {
            $arrayElemAt: ["$odds", 0],
          },
        },
      },
      {
        $addFields: {
          awayMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.awayTeamMoneyline.us"],
              },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          homeMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$odds.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$odds.homeTeamMoneyline.us"],
              },
              "$odds.homeTeamMoneyline.us",
            ],
          },
          awayLiveMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$liveOdds.awayTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$liveOdds.awayTeamMoneyline.us"],
              },
              "$liveOdds.awayTeamMoneyline.us",
            ],
          },
          homeLiveMoneyline: {
            $cond: [
              {
                $gte: [
                  {
                    $toDouble: "$liveOdds.homeTeamMoneyline.us",
                  },
                  0,
                ],
              },
              {
                $concat: ["+", "$liveOdds.homeTeamMoneyline.us"],
              },
              "$liveOdds.homeTeamMoneyline.us",
            ],
          },
        },
      },
      {
        $addFields: {
          isAwayTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isAwayTeamLiveNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$awayLiveMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
          isHomeTeamLiveNagative: {
            $cond: {
              if: {
                $lt: [
                  {
                    $toDouble: "$homeLiveMoneyline",
                  },
                  0,
                ],
              },
              then: "yes",
              else: "no",
            },
          },
        },
      },
      {
        $addFields: {
          isAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "$isAwayTeamNagative"],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
          isLiveAwayNagativeOrHomeOrBoth: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$isHomeTeamLiveNagative", "$isAwayTeamLiveNagative"],
                  },
                  then: "bothNagative",
                },
                {
                  case: {
                    $eq: ["$isAwayTeamLiveNagative", "yes"],
                  },
                  then: "awayIsNagative",
                },
                {
                  case: {
                    $eq: ["$isHomeTeamLiveNagative", "yes"],
                  },
                  then: "homeIsNagative",
                },
              ],
              default: 10,
            },
          },
        },
      },
      {
        $addFields: {
          favorite: {
            $cond: {
              if: {
                $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayMoneyline",
                          },
                          {
                            $toDouble: "$homeMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeMoneyline",
                          },
                          {
                            $toDouble: "$awayMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
          favoriteLive: {
            $cond: {
              if: {
                $eq: ["$isLiveAwayNagativeOrHomeOrBoth", "bothNagative"],
              },
              then: {
                $switch: {
                  branches: [
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$awayLiveMoneyline",
                          },
                          {
                            $toDouble: "$homeLiveMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "away",
                        moneyline: {
                          $abs: {
                            $toDouble: "$awayLiveMoneyline",
                          },
                        },
                      },
                    },
                    {
                      case: {
                        $lt: [
                          {
                            $toDouble: "$homeLiveMoneyline",
                          },
                          {
                            $toDouble: "$awayLiveMoneyline",
                          },
                        ],
                      },
                      then: {
                        favorite: "home",
                        moneyline: {
                          $abs: {
                            $toDouble: "$homeLiveMoneyline",
                          },
                        },
                      },
                    },
                  ],
                  default: 10,
                },
              },
              else: {
                $cond: {
                  if: {
                    $eq: ["$isAwayTeamLiveNagative", "yes"],
                  },
                  then: {
                    favorite: "away",
                    moneyline: {
                      $abs: {
                        $toDouble: "$awayLiveMoneyline",
                      },
                    },
                  },
                  else: {
                    favorite: "home",
                    moneyline: {
                      $abs: {
                        $toDouble: "$homeLiveMoneyline",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          underdog: {
            $cond: {
              if: {
                $eq: ["$favorite.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayMoneyline" },
                },
              },
            },
          },
          underdogLive: {
            $cond: {
              if: {
                $eq: ["$favoriteLive.favorite", "away"],
              },
              then: {
                underdog: "home",
                moneyline: {
                  $abs: { $toDouble: "$homeLiveMoneyline" },
                },
              },
              else: {
                underdog: "away",
                moneyline: {
                  $abs: { $toDouble: "$awayLiveMoneyline" },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          favIP: {
            $multiply: [
              {
                $divide: [
                  "$favorite.moneyline",
                  {
                    $add: ["$favorite.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIp: {
            $multiply: [
              {
                $divide: [
                  100,
                  {
                    $add: ["$underdog.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          favIPLive: {
            $multiply: [
              {
                $divide: [
                  "$favoriteLive.moneyline",
                  {
                    $add: ["$favoriteLive.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
          underIpLive: {
            $multiply: [
              {
                $divide: [
                  "$underdogLive.moneyline",
                  {
                    $add: ["$underdogLive.moneyline", 100],
                  },
                ],
              },
              100,
            ],
          },
        },
      },
      {
        $addFields: {
          favoriteFoc: {
            $divide: [
              "$favIP",
              {
                $add: ["$favIP", "$underIp"],
              },
            ],
          },
          underdogFoc: {
            $divide: [
              "$underIp",
              {
                $add: ["$underIp", "$favIP"],
              },
            ],
          },
          favoriteFocLive: {
            $divide: [
              "$favIPLive",
              {
                $add: ["$favIPLive", "$underIpLive"],
              },
            ],
          },
          underdogFocLive: {
            $divide: [
              "$underIpLive",
              {
                $add: ["$underIpLive", "$favIPLive"],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          favRemovePoint: {
            $multiply: ["$favoriteFoc", 100],
          },
          favRemovePointLive: {
            $multiply: ["$favoriteFocLive", 100],
          },
        },
      },
      {
        $addFields: {
          favoriteOdd: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$favRemovePoint", "$underdogFoc"],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOdd: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFoc"],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
          favoriteOddLive: {
            $toString: {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: ["$favRemovePointLive", "$underdogFocLive"],
                    },
                    -1,
                  ],
                },
                0,
              ],
            },
          },
          underdogOddLive: {
            $toString: {
              $round: [
                {
                  $subtract: [
                    {
                      $divide: [100, "$underdogFocLive"],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          id: 1,
          attendance: 1,
          goalServeMatchId: 1,
          venueName: 1,
          event: true,
          outs: {
            $cond: {
              if: { $ne: ["$outs", ""] },
              then: { $concat: ["$outs", " Out"] },
              else: {
                $concat: ["0", " Out"],
              },
            },
          },
          inningNo: { $arrayElemAt: ["$inningNo", 1] },
          timer: "$timer",
          datetime_utc: "$dateTimeUtc",
          homeTeamTotalScore: "$homeTeamTotalScore",
          awayTeamTotalScore: "$awayTeamTotalScore",
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
          innings: {
            awayTeam: "$awayTeamInnings",
            homeTeam: "$homeTeamInnings",
          },
          awayTeam: {
            awayTeamName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            awayTeamErrors: "$awayTeamError",
            goalServeAwayTeamId: {
              $arrayElemAt: ["$teams.awayTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.awayTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.awayTeam.lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
          },
          homeTeam: {
            homeTeamName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            goalServeHomeTeamId: {
              $arrayElemAt: ["$teams.homeTeam.goalServeTeamId", 0],
            },
            homeTeamRun: "$homeTeamTotalScore",
            homeTeamHit: "$homeTeamHit",
            homeTeamErrors: "$homeTeamError",
            won: { $arrayElemAt: ["$standings.homeTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.homeTeam.lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
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
          teamStatistic: {
            homeTeam: {
              walks: {
                $arrayElemAt: ["$statsTeams.homeTeam.walks", 0],
              },
              strikeouts: {
                $arrayElemAt: ["$statsTeams.homeTeam.strikeouts", 0],
              },
              batting_avg: {
                $arrayElemAt: ["$statsTeams.homeTeam.batting_avg", 0],
              },
              hits: { $arrayElemAt: ["$statsTeams.homeTeam.hits", 0] },
              runs: { $arrayElemAt: ["$statsTeams.homeTeam.runs", 0] },
              on_base_percentage: {
                $arrayElemAt: ["$statsTeams.homeTeam.on_base_percentage", 0],
              },
              slugging_percentage: {
                $arrayElemAt: ["$statsTeams.homeTeam.slugging_percentage", 0],
              },
              on_base_plus_slugging: {
                $round: [
                  {
                    $sum: [
                      {
                        $toDouble: {
                          $arrayElemAt: [
                            "$statsTeams.homeTeam.on_base_percentage",
                            0,
                          ],
                        },
                      },
                      {
                        $toDouble: {
                          $arrayElemAt: [
                            "$statsTeams.homeTeam.slugging_percentage",
                            0,
                          ],
                        },
                      },
                    ],
                  },
                  3,
                ],
              },
              runs_batted_in: {
                $arrayElemAt: ["$statsTeams.homeTeam.runs_batted_in", 0],
              },
            },
            awayTeam: {
              walks: {
                $arrayElemAt: ["$statsTeams.awayTeam.walks", 0],
              },
              strikeouts: {
                $arrayElemAt: ["$statsTeams.awayTeam.strikeouts", 0],
              },
              batting_avg: {
                $arrayElemAt: ["$statsTeams.awayTeam.batting_avg", 0],
              },
              hits: { $arrayElemAt: ["$statsTeams.awayTeam.hits", 0] },
              runs: { $arrayElemAt: ["$statsTeams.awayTeam.runs", 0] },
              on_base_percentage: {
                $arrayElemAt: ["$statsTeams.awayTeam.on_base_percentage", 0],
              },
              slugging_percentage: {
                $arrayElemAt: ["$statsTeams.awayTeam.slugging_percentage", 0],
              },
              on_base_plus_slugging: {
                $round: [
                  {
                    $sum: [
                      {
                        $toDouble: {
                          $arrayElemAt: [
                            "$statsTeams.awayTeam.on_base_percentage",
                            0,
                          ],
                        },
                      },
                      {
                        $toDouble: {
                          $arrayElemAt: [
                            "$statsTeams.awayTeam.slugging_percentage",
                            0,
                          ],
                        },
                      },
                    ],
                  },
                  3,
                ],
              },
              runs_batted_in: {
                $arrayElemAt: ["$statsTeams.awayTeam.runs_batted_in", 0],
              },
            },
          },
          startingPitcher: {
            awayTeam: {
              wins: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.wins",
                  0,
                ],
              },
              losses: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.losses",
                  0,
                ],
              },
              playerName: {
                $arrayElemAt: ["$startingPitchersPlayer.awayTeam.name", 0],
              },
              earned_run_average: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.earned_run_average",
                  0,
                ],
              },
              walk_hits_per_inning_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.walk_hits_per_inning_pitched",
                  0,
                ],
              },
              innings_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.innings_pitched",
                  0,
                ],
              },
              hits: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.hits",
                  0,
                ],
              },
              strikeouts: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.strikeouts",
                  0,
                ],
              },
              walks: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.walks",
                  0,
                ],
              },
              home_runs: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.awayTeam.pitching.home_runs",
                  0,
                ],
              },
            },
            homeTeam: {
              wins: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.wins",
                  0,
                ],
              },
              losses: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.losses",
                  0,
                ],
              },
              playerName: {
                $arrayElemAt: ["$startingPitchersPlayer.homeTeam.name", 0],
              },
              earned_run_average: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.earned_run_average",
                  0,
                ],
              },
              walk_hits_per_inning_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.walk_hits_per_inning_pitched",
                  0,
                ],
              },
              innings_pitched: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.innings_pitched",
                  0,
                ],
              },
              hits: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.hits",
                  0,
                ],
              },
              strikeouts: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.strikeouts",
                  0,
                ],
              },
              walks: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.walks",
                  0,
                ],
              },
              home_runs: {
                $arrayElemAt: [
                  "$startingPitchersPlayer.homeTeam.pitching.home_runs",
                  0,
                ],
              },
            },
          },
          battingPlayerStatistics: {
            awayTeam: {
              $map: {
                input: "$awayTeamHitters",
                as: "item",
                in: {
                  home_runs: "$$item.home_runs",
                  average: "$$item.average",
                  runs: "$$item.runs",
                  goalServePlayerId: "$$item.id",
                  playerName: "$$item.name",
                  hits: "$$item.hits",
                  strikeouts: "$$item.strikeouts",
                  walks: "$$item.walks",
                  at_bats: "$$item.at_bats",
                  runs_batted_in: "$$item.runs_batted_in",
                },
              },
            },
            homeTeam: {
              $map: {
                input: "$homeTeamHitters",
                as: "item",
                in: {
                  home_runs: "$$item.home_runs",
                  average: "$$item.average",
                  runs: "$$item.runs",
                  goalServePlayerId: "$$item.id",
                  playerName: "$$item.name",
                  hits: "$$item.hits",
                  strikeouts: "$$item.strikeouts",
                  walks: "$$item.walks",
                  at_bats: "$$item.at_bats",
                  runs_batted_in: "$$item.runs_batted_in",
                },
              },
            },
          },
          scoring: {
            awayTeam: {
              hit: "$awayTeamHit",
              runs: "$awayTeamTotalScore",
              error: "$awayTeamError",
            },
            homeTeam: {
              hit: "$homeTeamHit",
              runs: "$homeTeamTotalScore",
              error: "$homeTeamError",
            },
          },
          closingOddsAndOutcome: {
            awayTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            homeTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favorite.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOdd"],
                    },
                    else: "$favoriteOdd",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOdd",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOdd"],
                    },
                    else: "$underdogOdd",
                  },
                },
              },
            },
            awayTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.awayTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.awayTeamMoneyline.us"] },
                "$odds.awayTeamMoneyline.us",
              ],
            },
            homeTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.homeTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.homeTeamMoneyline.us"] },
                "$odds.homeTeamMoneyline.us",
              ],
            },
            homeTeamSpreadObj: {
              homeTeamSpread: "$odds.homeTeamSpread",
              homeTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$odds.homeTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$odds.homeTeamSpreadUs"] },
                  "$odds.homeTeamSpreadUs",
                ],
              },
            },
            awayTeamSpreadObj: {
              awayTeamSpread: "$odds.awayTeamSpread",
              awayTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$odds.awayTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$odds.awayTeamSpreadUs"] },
                  "$odds.awayTeamSpreadUs",
                ],
              },
            },
            homeTeamTotal: "$odds.homeTeamTotal",
            awayTeamTotal: "$odds.awayTeamTotal",
          },
          liveOdds: {
            awayTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favoriteLive.favorite", "away"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOddLive",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOddLive"],
                    },
                    else: "$favoriteOddLive",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOddLive",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOddLive"],
                    },
                    else: "$underdogOddLive",
                  },
                },
              },
            },
            homeTeamMoneyLine: {
              $cond: {
                if: {
                  $eq: ["$favoriteLive.favorite", "home"],
                },
                then: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$favoriteOddLive",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$favoriteOddLive"],
                    },
                    else: "$favoriteOddLive",
                  },
                },

                else: {
                  $cond: {
                    if: {
                      $gte: [
                        {
                          $toDouble: "$underdogOddLive",
                        },
                        0,
                      ],
                    },
                    then: {
                      $concat: ["+", "$underdogOddLive"],
                    },
                    else: "$underdogOddLive",
                  },
                },
              },
            },
            awayTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$liveOdds.awayTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$liveOdds.awayTeamMoneyline.us"] },
                "$liveOdds.awayTeamMoneyline.us",
              ],
            },
            homeTeamMoneyLineGoalServe: {
              $cond: [
                { $gte: [{ $toDouble: "$liveOdds.homeTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$liveOdds.homeTeamMoneyline.us"] },
                "$liveOdds.homeTeamMoneyline.us",
              ],
            },
            homeTeamSpreadObj: {
              homeTeamSpread: "$liveOdds.homeTeamSpread",
              homeTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$liveOdds.homeTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$liveOdds.homeTeamSpreadUs"] },
                  "$liveOdds.homeTeamSpreadUs",
                ],
              },
            },
            awayTeamSpreadObj: {
              awayTeamSpread: "$liveOdds.awayTeamSpread",
              awayTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$liveOdds.awayTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$liveOdds.awayTeamSpreadUs"] },
                  "$liveOdds.awayTeamSpreadUs",
                ],
              },
            },
            homeTeamTotal: "$liveOdds.homeTeamTotal",
            awayTeamTotal: "$liveOdds.awayTeamTotal",
          },
        },
      },
    ]);
    getMatch.map((item: any) => {
      const string = item?.inningNo;
      const number = parseInt(string?.replace(/\D/g, ""));
      if (item) item.status = number ? `Inning ${number}` : "";
    });

    await socket("mlbLiveBoxscore", {
      getMatch,
    });
    return getMatch;
  } catch (error: any) {
    console.log("error", error);
  }
};

const createOrUpdateOdds = async () => {
  let subDate = moment()
    .startOf("day")
    .subtract(12, "hours")
    .utc()
    .toISOString();
  let addDate = moment().add(24, "hours").utc().toISOString();
  let day1 = moment(subDate).format("D");
  let month1 = moment(subDate).format("MM");
  let year1 = moment(subDate).format("YYYY");
  let date1 = `${day1}.${month1}.${year1}`;

  let day2 = moment(addDate).format("D");
  let month2 = moment(addDate).format("MM");
  let year2 = moment(addDate).format("YYYY");
  let date2 = `${day2}.${month2}.${year2}`;

  try {
    let data = {
      json: true,
      date1: date1,
      date2: date2,
      showodds: "1",
      bm: "451,",
    };
    const getScore = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/mlb_shedule"
    );
    var matchData = getScore?.data?.fixtures?.category?.matches;
    if (matchData?.length > 0) {
      let data: Partial<IOddModel>;
      for (let i = 0; i < matchData?.length; i++) {
        for (let j = 0; j < matchData[i]?.match?.length; j++) {
          const findOdd = await Odd.find({
            goalServeMatchId: matchData[i]?.match[j].id,
          });
          const findMatch = await Match.findOne({
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
            : undefined;
          const homeTeamMoneyline = getMoneyLine
            ? getMoneyLine?.bookmaker?.odd?.find(
                (item: any) => item?.name === "1"
              )
            : undefined;
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
          data = {
            goalServerLeagueId: league?.goalServeLeagueId,
            goalServeMatchId: matchData[i]?.match[j]?.id,
            goalServeHomeTeamId: matchData[i]?.match[j]?.hometeam?.id,
            goalServeAwayTeamId: matchData[i]?.match[j]?.awayteam?.id,
            // homeTeamSpread: homeTeamSpread,
            ...(homeTeamSpread && { homeTeamSpread: homeTeamSpread }),
            // homeTeamTotal: totalValues,
            ...(totalValues && { homeTeamTotal: totalValues }),
            // awayTeamSpread: awayTeamSpread,
            ...(awayTeamSpread && { awayTeamSpread: awayTeamSpread }),
            // awayTeamTotal: totalValues,
            ...(totalValues && { awayTeamTotal: totalValues }),
            ...(awayTeamMoneyline && { awayTeamMoneyline: awayTeamMoneyline }),
            ...(homeTeamMoneyline && { homeTeamMoneyline: homeTeamMoneyline }),
          };
          if (findOdd?.length > 0) {
            if (findMatch?.status == "Not Started") {
              data.status = findMatch?.status;
              await Odd.findOneAndUpdate(
                { goalServeMatchId: matchData[i]?.match[j].id },
                { $set: data },
                { new: true }
              );
            } else if (
              findMatch?.status != "Not Started" &&
              findMatch?.status != "Final" &&
              findMatch?.status != "Postponed" &&
              findMatch?.status != "Canceled" &&
              findMatch?.status != "Suspended"
            ) {
              data.status = findMatch?.status;
              await Odd.updateOne(
                {
                  goalServeMatchId: matchData[i]?.match[j].id,
                  status: findMatch?.status,
                },
                { $set: data },
                { upsert: true }
              );
            } else {
              const findOddWithStatus = await Odd.find({
                goalServeMatchId: matchData[i]?.match[j].id,
                status: findMatch?.status,
              });
              if (findOddWithStatus.length > 0) {
                return;
              } else {
                data.status = findMatch?.status;
                await Odd.findOneAndUpdate(
                  { goalServeMatchId: matchData[i]?.match[j].id },
                  { $set: data },
                  { new: true }
                );
              }
            }
          }
        }
      }
    }
  } catch (error: any) {
    console.log("error", error);
  }
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
  updateCurruntDateRecord,
  teamStats,
  updateInjuryRecored,
  updateStandingRecord,
  updateTeamStats,
  updatePlayerStats,
  mlbSingleGameBoxScoreLive,
  liveBoxscoreMlb,
  createOrUpdateOdds,
};
