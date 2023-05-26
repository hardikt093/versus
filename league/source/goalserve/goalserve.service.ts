import httpStatus from "http-status";
import { IDivision, ITeam } from "../interfaces/input";
import { axiosGet } from "../services/axios.service";
import { goalserveApi } from "../services/goalserve.service";
import betServices from "../bet/bet.service";
import socket from "../services/socket.service";
import AppError from "../utils/AppError";
import League from "../models/documents/league.model";
import moment from "moment";
import Player from "../models/documents/player.model";
import Team from "../models/documents/team.model";
import Division from "../models/documents/division.model";
import { isArray } from "lodash";
import Match from "../models/documents/match.model";
import Bet from "../models/documents/bet.model";
import Inning from "../models/documents/inning.model";
import StartingPitchers from "../models/documents/startingPictures";
import Standings from "../models/documents/standing.model";
import Injury from "../models/documents/injuy.model";
import Odd from "../models/documents/odd.model";
import StatsPlayer from "../models/documents/statsPlayer.model";
import StatsTeam from "../models/documents/teamStats.model";
import TeamNHL from "../models/documents/NHL/team.model";
import TeamImageNHL from "../models/documents/NHL/teamImage.model";
import NhlMatch from "../models/documents/NHL/match.model";
import PlayersNHL from "../models/documents/NHL/player.model";
import NhlInjury from "../models/documents/NHL/injury.model";
import NhlStandings from "../models/documents/NHL/standing,model";
import TeamNBA from "../models/documents/NBA/team.model";
import TeamImageNBA from "../models/documents/NBA/teamImage.model";
import NbaMatch from "../models/documents/NBA/match.model";
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
    let day = moment().format("D");
    let month = moment().format("MM");
    let year = moment().format("YYYY");
    let date = `${day}.${month}.${year}`;
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
            awayTeamRun: "$awayTeamTotalScore",
            awayTeamHit: "$awayTeamHit",
            awayTeamErrors: "$awayTeamError",
            won: "$awayTeamStandings.won",
            lose: "$awayTeamStandings.lost",
            teamImage: "$awayTeamImage.image",
            moneyline: {
              $arrayElemAt: ["$odds.awayTeamMoneyline", 0],
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
            homeTeamRun: "$homeTeamTotalScore",
            homeTeamHit: "$homeTeamHit",
            homeTeamErrors: "$homeTeamError",
            won: "$homeTeamStandings.won",
            lose: "$homeTeamStandings.lost",
            teamImage: "$homeTeamImage.image",
            moneyline: {
              $arrayElemAt: ["$odds.homeTeamMoneyline", 0],
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
    let day = moment().format("D");
    let month = moment().format("MM");
    let year = moment().format("YYYY");
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
            $toInt: "$awayTeamTotalScore",
          },
          homeTeamTotalScoreInNumber: {
            $toInt: "$homeTeamTotalScore",
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
    await socket("mlbLiveMatch", {
      getLiveMatch,
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
          $toInt: "$awayTeamTotalScore",
        },
        homeTeamTotalScoreInNumber: {
          $toInt: "$homeTeamTotalScore",
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
      $match: {
        formattedDate: date,
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
    let dataJson = { json: true, date1: item };
    const mlb_shedule = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      dataJson,
      `baseball/mlb_shedule`
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
  let dataJson = { json: true, date: "28.04.2023" };
  const mlb_shedule = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    dataJson,
    `baseball/usa`
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
  const team = await Team.find({ isDeleted: false });
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
          $toInt: "$awayTeamTotalScore",
        },
        homeTeamTotalScoreInNumber: {
          $toInt: "$homeTeamTotalScore",
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
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
          moneyline: {
            $arrayElemAt: ["$odds.awayTeamMoneyline", 0],
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
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
          moneyline: {
            $arrayElemAt: ["$odds.homeTeamMoneyline", 0],
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
    getLiveMatch: await getLiveDataFromMongodb(),
    getUpcomingMatch: await getUpcomingDataFromMongodb(),
    getFinalMatch: await getFinalMatchDataFromDB(),
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
          $toInt: "$awayTeamTotalScore",
        },
        homeTeamTotalScoreInNumber: {
          $toInt: "$homeTeamTotalScore",
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
          awayTeamMoneyLine: "$odds.awayTeamMoneyline",
          homeTeamMoneyLine: "$odds.homeTeamMoneyline",
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

  var daylist = getDaysArray(new Date("2023-02-28"), new Date("2023-05-24"));
  for (let i = 0; i < daylist?.length; i++) {
    let data = { json: true, date: daylist[i] };
    const getMatch = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/usa"
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
      let data = {
        json: true,
      };
      const injuryApi = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        `baseball/${item?.goalServeTeamId}_injuries`
      );

      const injuryArray1 = injuryApi?.data?.team;
      if (injuryArray1?.report?.length) {
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
            const playerData = new Injury(data);
            const saveInjuries = await playerData.save();
          })
        );
      } else {
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
      $addFields: {
        awayTeamInjuredPlayers: {
          $map: {
            input: "$awayTeamInjuredPlayers",
            as: "item",
            in: {
              date: "$$item.date",
              status: "$$item.status",
              description: "$$item.description",
              playerName: "$$item.playerName",
            },
          },
        },
        homeTeamInjuredPlayers: {
          $map: {
            input: "$homeTeamInjuredPlayers",
            as: "item",
            in: {
              date: "$$item.date",
              status: "$$item.status",
              description: "$$item.description",
              playerName: "$$item.playerName",
            },
          },
        },
      },
    },

    {
      $lookup: {
        from: "players",
        let: {
          awayTeamPlayerId: {
            $cond: {
              if: { $ne: ["$startingPitchers.awayteam.player.id", ""] },
              then: { $toInt: "$startingPitchers.awayteam.player.id" },
              else: null,
            },
          },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$goalServePlayerId", "$$awayTeamPlayerId"],
              },
            },
          },
        ],
        as: "awayTeamStartingPitchers",
      },
    },
    {
      $unwind: {
        path: "$awayTeamStartingPitchers",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "players",
        let: {
          homeTeamPlayerId: {
            $cond: {
              if: { $ne: ["$startingPitchers.hometeam.player.id", ""] },
              then: { $toInt: "$startingPitchers.hometeam.player.id" },
              else: null,
            },
          },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$goalServePlayerId", "$$homeTeamPlayerId"],
              },
            },
          },
        ],
        as: "homeTeamStartingPitchers",
      },
    },
    {
      $unwind: {
        path: "$homeTeamStartingPitchers",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "statsteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamStats",
      },
    },
    {
      $unwind: {
        path: "$awayTeamStats",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "statsteams",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamStats",
      },
    },
    {
      $unwind: {
        path: "$homeTeamStats",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "players",
        let: { awayTeamId: "$goalServeAwayTeamId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$goalServeTeamId", "$$awayTeamId"] } } },
          {
            $set: { home_run_float_away: { $toDouble: "$batting.home_runs" } },
          },
        ],
        as: "awayTeamHomeRuns",
      },
    },
    { $unwind: "$awayTeamHomeRuns" },
    { $sort: { "awayTeamHomeRuns.home_run_float_away": -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "players",
        let: { homeTeamId: "$goalServeHomeTeamId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$goalServeTeamId", "$$homeTeamId"] } } },
          {
            $set: { home_run_float_home: { $toDouble: "$batting.home_runs" } },
          },
        ],
        as: "homeTeamHomeRuns",
      },
    },
    { $unwind: "$homeTeamHomeRuns" },
    { $sort: { "homeTeamHomeRuns.home_run_float_home": -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "players",
        let: { homeTeamId: "$goalServeHomeTeamId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$goalServeTeamId", "$$homeTeamId"] } } },
          {
            $set: {
              batting_avg_float_home: { $toDouble: "$batting.batting_avg" },
            },
          },
        ],
        as: "homeTeamBatting_avg",
      },
    },
    { $unwind: "$homeTeamBatting_avg" },
    { $sort: { "homeTeamBatting_avg.batting_avg_float_home": -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "players",
        let: { awayTeamId: "$goalServeAwayTeamId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$goalServeTeamId", "$$awayTeamId"] } } },
          {
            $set: {
              batting_avg_float_Away: { $toDouble: "$batting.batting_avg" },
            },
          },
        ],
        as: "awayTeamBatting_avg",
      },
    },
    { $unwind: "$awayTeamBatting_avg" },
    { $sort: { "awayTeamBatting_avg.batting_avg_float_Away": -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "players",
        let: { awayTeamId: "$goalServeAwayTeamId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$goalServeTeamId", "$$awayTeamId"] } } },
          {
            $set: {
              RBI_float_away: { $toDouble: "$batting.runs_batted_in" },
            },
          },
        ],
        as: "awayTeamRBI",
      },
    },
    { $unwind: "$awayTeamRBI" },
    { $sort: { "awayTeamRBI.RBI_float_away": -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "players",
        let: { homeTeamId: "$goalServeHomeTeamId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$goalServeTeamId", "$$homeTeamId"] } } },
          {
            $set: {
              RBI_Float_Home: { $toDouble: "$batting.runs_batted_in" },
            },
          },
        ],
        as: "homeTeamRBI",
      },
    },
    { $unwind: "$homeTeamRBI" },
    { $sort: { "homeTeamRBI.RBI_Float_Home": -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "odds",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "odds",
      },
    },
    {
      $project: {
        id: true,
        attendance: true,
        status: true,
        venueName: true,
        hittingLeaders: {
          homeRun: {
            homeTeam: {
              name: "$homeTeamHomeRuns.batting.name",
              home_runs: "$homeTeamHomeRuns.batting.home_runs",
            },
            awayTeam: {
              name: "$awayTeamHomeRuns.batting.name",
              home_runs: "$awayTeamHomeRuns.batting.home_runs",
            },
          },

          battingAvg: {
            awayTeam: {
              name: "$awayTeamBatting_avg.batting.name",
              batting_avg: "$awayTeamBatting_avg.batting.batting_avg",
            },
            homeTeam: {
              name: "$homeTeamBatting_avg.batting.name",
              batting_avg: "$homeTeamBatting_avg.batting.batting_avg",
            },
          },

          runsBattedIn: {
            awayTeam: {
              name: "$awayTeamRBI.batting.name",
              runs_batted_in: "$awayTeamRBI.batting.runs_batted_in",
            },
            homeTeam: {
              name: "$homeTeamRBI.batting.name",
              runs_batted_in: "$homeTeamRBI.batting.runs_batted_in",
            },
          },
        },
        datetime_utc: "$dateTimeUtc",
        awayTeamFullName: "$awayTeam.name",
        homeTeamFullName: "$homeTeam.name",
        awayTeamAbbreviation: "$awayTeam.abbreviation",
        homeTeamAbbreviation: "$homeTeam.abbreviation",
        homeTeamImage: "$homeTeamImage.image",
        awayTeamImage: "$awayTeamImage.image",
        injuredPlayers: {
          awayTeam: "$awayTeamInjuredPlayers",
          homeTeam: "$homeTeamInjuredPlayers",
        },

        teamStatistics: {
          homeTeam: {
            hits: "$homeTeamStats.hits",
            home_runs: "$homeTeamStats.home_runs",
            batting_avg: "$homeTeamStats.batting_avg",
            rank: "$homeTeamStats.rank",
            runs: "$homeTeamStats.runs",
            on_base_percentage: "$homeTeamStats.on_base_percentage",
            slugging_percentage: "$homeTeamStats.slugging_percentage",
            runs_batted_in: "$homeTeamStats.runs_batted_in",
            on_base_plus_slugging: {
              $round: [
                {
                  $add: [
                    {
                      $convert: {
                        input: "$homeTeamStats.on_base_percentage",
                        to: "double",
                        onError: 0,
                      },
                    },
                    {
                      $convert: {
                        input: "$homeTeamStats.slugging_percentage",
                        to: "double",
                        onError: 0,
                      },
                    },
                  ],
                },
                3,
              ],
            },
          },
          awayTeam: {
            hits: "$awayTeamStats.hits",
            home_runs: "$awayTeamStats.home_runs",
            batting_avg: "$awayTeamStats.batting_avg",
            rank: "$awayTeamStats.rank",
            runs: "$awayTeamStats.runs",
            on_base_percentage: "$awayTeamStats.on_base_percentage",
            slugging_percentage: "$awayTeamStats.slugging_percentage",
            runs_batted_in: "$awayTeamStats.runs_batted_in",
            on_base_plus_slugging: {
              $round: [
                {
                  $add: [
                    {
                      $convert: {
                        input: "$awayTeamStats.on_base_percentage",
                        to: "double",
                        onError: 0,
                      },
                    },
                    {
                      $convert: {
                        input: "$awayTeamStats.slugging_percentage",
                        to: "double",
                        onError: 0,
                      },
                    },
                  ],
                },
                3,
              ],
            },
          },
        },
        startingPitchers: {
          awayTeam: {
            throws: "$awayTeamStartingPitchers.throws",
            earned_run_average:
              "$awayTeamStartingPitchers.pitching.earned_run_average",
            walk_hits_per_inning_pitched:
              "$awayTeamStartingPitchers.pitching.walk_hits_per_inning_pitched",
            innings_pitched:
              "$awayTeamStartingPitchers.pitching.innings_pitched",
            hits: "$awayTeamStartingPitchers.pitching.hits",
            strikeouts: "$awayTeamStartingPitchers.pitching.strikeouts",
            walks: "$awayTeamStartingPitchers.pitching.walks",
            home_runs: "$awayTeamStartingPitchers.pitching.home_runs",
            losses: "$awayTeamStartingPitchers.pitching.losses",
            wins: "$awayTeamStartingPitchers.pitching.wins",
            name: "$awayTeamStartingPitchers.pitching.name",
          },
          homeTeam: {
            throws: "$homeTeamStartingPitchers.throws",
            earned_run_average:
              "$homeTeamStartingPitchers.pitching.earned_run_average",
            walk_hits_per_inning_pitched:
              "$homeTeamStartingPitchers.pitching.walk_hits_per_inning_pitched",
            innings_pitched:
              "$homeTeamStartingPitchers.pitching.innings_pitched",
            hits: "$homeTeamStartingPitchers.pitching.hits",
            strikeouts: "$homeTeamStartingPitchers.pitching.strikeouts",
            walks: "$homeTeamStartingPitchers.pitching.walks",
            home_runs: "$homeTeamStartingPitchers.pitching.home_runs",
            losses: "$homeTeamStartingPitchers.pitching.losses",
            wins: "$homeTeamStartingPitchers.pitching.wins",
            name: "$homeTeamStartingPitchers.pitching.name",
          },
        },
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam.goalServeTeamId",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
          moneyline: {
            $arrayElemAt: ["$odds.awayTeamMoneyline", 0],
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
          homeTeamId: "$homeTeam.goalServeTeamId",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
          moneyline: {
            $arrayElemAt: ["$odds.homeTeamMoneyline", 0],
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
  return { getMatch: getMatch[0] };
};

const createAndUpdateOdds = async () => {
  let day = moment().format("D");
  let month = moment().format("MM");
  let year = moment().format("YYYY");
  let date = `${day}.${month}.${year}`;
  try {
    let data = { json: true, date1: date, showodds: "1", bm: "455," };
    const getScore = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/mlb_shedule"
    );

    var matchData = getScore?.data?.fixtures?.category?.matches?.match;
    if (matchData?.length > 0) {
      const takeData = await matchData?.map(async (item: any) => {
        if (item.status === "Not Started") {
          const league: any = await League.findOne({
            goalServeLeagueId: getScore?.data.fixtures?.category?.id,
          });
          const findMatchOdds = await Odd.find({ goalServeMatchId: item?.id });
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
              : {};
            const homeTeamMoneyline = getMoneyLine
              ? getMoneyLine?.bookmaker?.odd?.find(
                  (item: any) => item?.name === "1"
                )
              : {};
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
              : "";

            const homeTeamSpread = getHomeTeamRunLine
              ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
              : "";
            const total = await getTotal("Over/Under", item?.odds?.type);
            const totalValues = await getTotalValues(total);
            let data = {
              goalServerLeagueId: league.goalServeLeagueId,
              goalServeMatchId: item?.id,
              goalServeHomeTeamId: item?.hometeam?.id,
              goalServeAwayTeamId: item?.awayteam?.id,
              homeTeamSpread: homeTeamSpread,
              homeTeamTotal: totalValues,
              awayTeamSpread: awayTeamSpread,
              awayTeamTotal: totalValues,
              awayTeamMoneyline: awayTeamMoneyline,
              homeTeamMoneyline: homeTeamMoneyline,
            };
            const oddsData = new Odd(data);
            const savedOddsData = await oddsData.save();
          } else {
            // getMoneyLine
            const getMoneyLine: any = await getOdds(
              "Home/Away",
              item?.odds?.type
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
              : "null";

            const homeTeamSpread = getHomeTeamRunLine
              ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
              : "null";
            const total = await getTotal("Over/Under", item?.odds?.type);
            const totalValues = await getTotalValues(total);
            let data = {
              goalServerLeagueId: league.goalServeLeagueId,
              goalServeMatchId: item?.id,
              goalServeHomeTeamId: item?.hometeam?.id,
              goalServeAwayTeamId: item?.awayteam?.id,
              homeTeamSpread: homeTeamSpread,
              homeTeamTotal: totalValues,
              awayTeamSpread: awayTeamSpread,
              awayTeamTotal: totalValues,
              awayTeamMoneyline: awayTeamMoneyline,
              homeTeamMoneyline: homeTeamMoneyline,
            };
            const updateOdds = await Odd.findOneAndUpdate(
              { goalServerMatchId: item?.id },
              { $set: data },
              { new: true }
            );
          }
        }
      });
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
        const league: any = await League.findOne({
          goalServeLeagueId: getMatch?.data.scores.category.id,
        });
        if (
          matchArray[j].status != "Not Started" &&
          matchArray[j].status != "Final"
        ) {
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
          const recordUpdate = await Match.findOneAndUpdate(
            { goalServeMatchId: data.goalServeMatchId },
            { $set: data },
            { new: true }
          );
        } else {
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
          const recordUpdate = await Match.findOneAndUpdate(
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

// NHL
const createTeamNHL = async (body: any) => {
  let dataJson = {
    json: true,
  };
  const standing = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    dataJson,
    `hockey/nhl-standings`
  );

  const league = await League.findOne({
    goalServeLeagueId: standing.data.standings.category.id,
  });
  let data: any = {
    goalServeLeagueId: standing.data.standings.category.id,
    leagueId: league?.id,
  };
  standing.data.standings.category.league.map((div: any) => {
    data.leagueType = div.name;
    div.division.map((val: any) => {
      data.division = val.name;
      val.team.map(async (team: any) => {
        const roaster = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          dataJson,
          `hockey/${team.id}_rosters`
        );

        data.name = team.name;
        data.goalServeTeamId = team.id;
        data.abbreviation = roaster.data.team.abbreviation;
        const teamNew = new TeamNHL(data);
        await teamNew.save();
      });
    });
  });
};

const addNHLTeamImage = async (body: any) => {
  let data = {
    teamId: body.teamId,
    goalServeTeamId: body.goalServeTeamId,
    image: body.image,
  };
  const teamNewImage = new TeamImageNHL(data);
  await teamNewImage.save();
};

const addNhlMatch = async () => {
  try {
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
    var daylist = getDaysArray(new Date("2023-05-20"), new Date("2023-05-25"));
    for (let i = 0; i < daylist?.length; i++) {
      const getMatch = await axiosGet(
        `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/hockey/nhl-scores`,
        { json: true, date: daylist[i] }
      );
      const matchArray = await getMatch?.data?.scores?.category?.match;
      const league: any = await League.findOne({
        goalServeLeagueId: getMatch?.data.scores.category.id,
      });
      var savedMatchData: any = "";
      if (matchArray?.length > 0 && matchArray) {
        // array logic
        for (let j = 0; j < matchArray?.length; j++) {
          const data: any = {
            leagueId: league.id,
            goalServeLeagueId: league.goalServeLeagueId,
            date: matchArray[j].date,
            formattedDate: matchArray[j].formatted_date,
            timezone: matchArray[j].timezone,
            attendance: matchArray[j].attendance,
            goalServeMatchId: matchArray[j].id,
            dateTimeUtc: matchArray[j].datetime_utc,
            status: matchArray[j].status,
            time: matchArray[j].time,
            goalServeVenueId: matchArray[j].venue_id,
            venueName: matchArray[j].venue_name,
            homeTeamTotalScore: matchArray[j].hometeam.totalscore,
            awayTeamTotalScore: matchArray[j].awayteam.totalscore,
            // new entries
            timer: matchArray[j]?.timer ? matchArray[j]?.timer : "",
            isPp: matchArray[j]?.is_pp ? matchArray[j]?.is_pp : "",
            ppTime: matchArray[j]?.pp_time ? matchArray[j]?.pp_time : "",
            awayTeamOt: matchArray[j].awayteam.ot,
            awayTeamP1: matchArray[j].awayteam.p1,
            awayTeamP2: matchArray[j].awayteam.p2,
            awayTeamP3: matchArray[j].awayteam.p3,
            awayTeamPp: matchArray[j].awayteam.pp,
            awayTeamSo: matchArray[j].awayteam.so,

            homeTeamOt: matchArray[j].hometeam.ot,
            homeTeamP1: matchArray[j].hometeam.p1,
            homeTeamP2: matchArray[j].hometeam.p2,
            homeTeamP3: matchArray[j].hometeam.p3,
            homeTeamPp: matchArray[j].hometeam.pp,
            homeTeamSo: matchArray[j].hometeam.so,

            scoringFirstperiod: matchArray[j]?.scoring?.firstperiod?.event
              ? matchArray[j]?.scoring?.firstperiod?.event
              : [],
            scoringOvertime: matchArray[j]?.scoring?.overtime?.event
              ? matchArray[j]?.scoring?.overtime?.event
              : [],
            scoringSecondperiod: matchArray[j]?.scoring?.secondperiod?.event
              ? matchArray[j]?.scoring?.secondperiod?.event
              : [],
            scoringShootout: matchArray[j]?.scoring?.shootout?.event
              ? matchArray[j]?.scoring?.shootout?.event
              : [],
            scoringThirdperiod: matchArray[j]?.scoring?.thirdperiod?.event
              ? matchArray[j]?.scoring?.thirdperiod?.event
              : [],

            penaltiesFirstperiod: matchArray[j]?.penalties?.firstperiod?.penalty
              ? matchArray[j]?.penalties?.firstperiod?.penalty
              : [],
            penaltiesOvertime: matchArray[j]?.penalties?.overtime?.penalty
              ? matchArray[j]?.penalties?.overtime?.penalty
              : [],
            penaltiesSecondperiod: matchArray[j]?.penalties?.secondperiod
              ?.penalty
              ? matchArray[j]?.penalties?.secondperiod?.penalty
              : [],
            penaltiesThirdperiod: matchArray[j]?.penalties?.thirdperiod?.penalty
              ? matchArray[j]?.penalties?.thirdperiod?.penalty
              : [],

            teamStatsHomeTeam: matchArray[j]?.team_stats?.hometeam
              ? matchArray[j]?.team_stats?.hometeam
              : {},
            teamStatsAwayTeam: matchArray[j]?.team_stats?.awayteam
              ? matchArray[j]?.team_stats?.awayteam
              : {},

            playerStatsAwayTeam: matchArray[j]?.player_stats?.awayteam?.player
              ? matchArray[j]?.player_stats?.awayteam?.player
              : [],
            playerStatsHomeTeam: matchArray[j]?.player_stats?.hometeam?.player
              ? matchArray[j]?.player_stats?.hometeam?.player
              : [],

            powerPlayAwayTeam: matchArray[j]?.powerplay?.awayteam
              ? matchArray[j]?.powerplay?.awayteam
              : {},
            powerPlayHomeTeam: matchArray[j]?.powerplay?.hometeam
              ? matchArray[j]?.powerplay?.hometeam
              : {},

            goalkeeperStatsAwayTeam: matchArray[j]?.goalkeeper_stats?.awayteam
              ?.player
              ? matchArray[j]?.goalkeeper_stats?.awayteam?.player
              : [],
            goalkeeperStatsHomeTeam: matchArray[j]?.goalkeeper_stats?.hometeam
              ?.player
              ? matchArray[j]?.goalkeeper_stats?.hometeam?.player
              : [],
          };

          const teamIdAway: any = await TeamNHL.findOne({
            goalServeTeamId: matchArray[j].awayteam.id,
          });

          data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 1;

          const teamIdHome: any = await TeamNHL.findOne({
            goalServeTeamId: matchArray[j].hometeam.id,
          });

          data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 1;

          const matchData = new NhlMatch(data);
          savedMatchData = await matchData.save();
        }
      } else {
        if (matchArray) {
          const data: any = {
            leagueId: league.id,
            goalServeLeagueId: league.goalServeLeagueId,
            date: matchArray.date,
            formattedDate: matchArray.formatted_date,
            timezone: matchArray.timezone,
            attendance: matchArray.attendance,
            goalServeMatchId: matchArray.id,
            dateTimeUtc: matchArray.datetime_utc,
            status: matchArray.status,
            time: matchArray.time,
            goalServeVenueId: matchArray.venue_id,
            venueName: matchArray.venue_name,
            homeTeamTotalScore: matchArray.hometeam.totalscore,
            awayTeamTotalScore: matchArray.awayteam.totalscore,
            // new entries
            timer: matchArray?.timer ? matchArray?.timer : "",
            isPp: matchArray?.is_pp ? matchArray?.is_pp : "",
            ppTime: matchArray?.pp_time ? matchArray?.pp_time : "",
            awayTeamOt: matchArray.awayteam.ot,
            awayTeamP1: matchArray.awayteam.p1,
            awayTeamP2: matchArray.awayteam.p2,
            awayTeamP3: matchArray.awayteam.p3,
            awayTeamPp: matchArray.awayteam.pp,
            awayTeamSo: matchArray.awayteam.so,

            homeTeamOt: matchArray.hometeam.ot,
            homeTeamP1: matchArray.hometeam.p1,
            homeTeamP2: matchArray.hometeam.p2,
            homeTeamP3: matchArray.hometeam.p3,
            homeTeamPp: matchArray.hometeam.pp,
            homeTeamSo: matchArray.hometeam.so,

            scoringFirstperiod: matchArray?.scoring?.firstperiod?.event
              ? matchArray?.scoring?.firstperiod?.event
              : [],
            scoringOvertime: matchArray?.scoring?.overtime?.event
              ? matchArray?.scoring?.overtime?.event
              : [],
            scoringSecondperiod: matchArray?.scoring?.secondperiod?.event
              ? matchArray?.scoring?.secondperiod?.event
              : [],
            scoringShootout: matchArray?.scoring?.shootout?.event
              ? matchArray?.scoring?.shootout?.event
              : [],
            scoringThirdperiod: matchArray?.scoring?.thirdperiod?.event
              ? matchArray?.scoring?.thirdperiod?.event
              : [],

            penaltiesFirstperiod: matchArray?.penalties?.firstperiod?.penalty
              ? matchArray?.penalties?.firstperiod?.penalty
              : [],
            penaltiesOvertime: matchArray?.penalties?.overtime?.penalty
              ? matchArray?.penalties?.overtime?.penalty
              : [],
            penaltiesSecondperiod: matchArray?.penalties?.secondperiod?.penalty
              ? matchArray?.penalties?.secondperiod?.penalty
              : [],
            penaltiesThirdperiod: matchArray?.penalties?.thirdperiod?.penalty
              ? matchArray?.penalties?.thirdperiod?.penalty
              : [],

            teamStatsHomeTeam: matchArray?.team_stats?.hometeam
              ? matchArray?.team_stats?.hometeam
              : {},
            teamStatsAwayTeam: matchArray?.team_stats?.awayteam
              ? matchArray?.team_stats?.awayteam
              : {},

            playerStatsAwayTeam: matchArray?.player_stats?.awayteam?.player
              ? matchArray?.player_stats?.awayteam?.player
              : [],
            playerStatsHomeTeam: matchArray?.player_stats?.hometeam?.player
              ? matchArray?.player_stats?.hometeam?.player
              : [],

            powerPlayAwayTeam: matchArray?.powerplay?.awayteam
              ? matchArray?.powerplay?.awayteam
              : {},
            powerPlayHomeTeam: matchArray?.powerplay?.hometeam
              ? matchArray?.powerplay?.hometeam
              : {},

            goalkeeperStatsAwayTeam: matchArray?.goalkeeper_stats?.awayteam
              ?.player
              ? matchArray?.goalkeeper_stats?.awayteam?.player
              : [],
            goalkeeperStatsHomeTeam: matchArray?.goalkeeper_stats?.hometeam
              ?.player
              ? matchArray?.goalkeeper_stats?.hometeam?.player
              : [],
          };

          const teamIdAway: any = await TeamNHL.findOne({
            goalServeTeamId: matchArray.awayteam.id,
          });
          if (teamIdAway) {
            data.awayTeamId = teamIdAway.id;
            data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
              ? teamIdAway.goalServeTeamId
              : 0;
          }
          const teamIdHome: any = await TeamNHL.findOne({
            goalServeTeamId: matchArray.hometeam.id,
          });
          if (teamIdHome) {
            data.homeTeamId = teamIdHome.id;
            data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
              ? teamIdHome.goalServeTeamId
              : 0;
          }
          const matchData = new NhlMatch(data);
          savedMatchData = await matchData.save();
        }
      }
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
};

const addNhlPlayer = async () => {
  const team = await TeamNHL.find();
  let data = {
    json: true,
  };
  await Promise.all(
    team.map(async (item) => {
      const roasterApi = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        `hockey/${item.goalServeTeamId}_rosters`
      );
      let allRosterPlayers: any = [];
      roasterApi?.data?.team?.position?.map((roasterApiItem: any) => {
        if (roasterApiItem?.player?.length) {
          roasterApiItem.player.map((player: any) => {
            player.position = roasterApiItem?.name;
            player.teamId = item.id;
            player.goalServeTeamId = item.goalServeTeamId;
            player.goalServePlayerId = player.id;
            allRosterPlayers.push(player);
          });
        } else {
          let player = roasterApiItem.player;
          player.position = item?.name;
          player.teamId = item.id;
          player.goalServeTeamId = item.goalServeTeamId;
          player.goalServePlayerId = roasterApiItem.player.id;

          allRosterPlayers.push(player);
        }
      });
      const statsApi = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        `hockey/${item.goalServeTeamId}_stats`
      );
      let allStatePlayer: any = [];
      if (statsApi?.data?.statistic?.goalkeepers?.player?.length) {
        statsApi?.data?.statistic?.goalkeepers?.player?.map(
          (statsPlayer: any) => {
            statsPlayer.teamId = item.id;
            statsPlayer.isGoalKeeper = true;
            statsPlayer.goalServePlayerId = statsPlayer.id;
            allStatePlayer.push(statsPlayer);
          }
        );
      } else {
        let player: any = statsApi?.data?.statistic?.goalkeepers?.player;
        player.isGoalKeeper = true;
        player.goalServePlayerId =
          statsApi?.data?.statistic?.goalkeepers?.player?.id;
        player.teamId = item.id;
        allStatePlayer.push(player);
      }
      if (statsApi?.data?.statistic?.team?.length) {
        if (statsApi?.data?.statistic?.team[1]?.player?.length) {
          statsApi?.data?.statistic?.team[1]?.player?.map(
            (statsPlayer: any) => {
              statsPlayer.teamId = item.id;
              statsPlayer.goalServePlayerId = statsPlayer.id;
              allStatePlayer.push(statsPlayer);
            }
          );
        } else {
          let player: any = statsApi?.data?.statistic?.team[1]?.player;
          player.goalServePlayerId =
            statsApi?.data?.statistic?.team[1]?.player?.id;
          player.teamId = item.id;
          allStatePlayer.push(player);
        }
      }
      const mergedArr = allStatePlayer.map((obj1: any) => {
        const obj2 = allRosterPlayers.find(
          (obj2: any) => obj1?.goalServePlayerId === obj2?.goalServePlayerId
        );
        return { ...obj1, ...obj2 };
      });
      await PlayersNHL.insertMany(mergedArr);
    })
  );
};

const addNhlInjuredPlayer = async () => {
  const team = await TeamNHL.find();
  await Promise.all(
    team.map(async (item) => {
      let data = {
        json: true,
      };
      const injuryApi = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        `hockey/${item?.goalServeTeamId}_injuries`
      );

      const injuryArray1 = injuryApi?.data?.team;
      if (injuryArray1?.report?.length) {
        await Promise.all(
          injuryArray1?.report?.map(async (val: any) => {
            const player = await PlayersNHL.findOne({
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
            const playerData = new NhlInjury(data);
            const saveInjuries = await playerData.save();
          })
        );
      } else if (injuryArray1?.report && !injuryArray1?.report?.length) {
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
        const playerData = new NhlInjury(data);
        const saveInjuries = await playerData.save();
      }
    })
  );
};

const addNhlStandings = async () => {
  let data = {
    json: true,
  };
  const getstanding = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    "hockey/nhl-standings"
  );

  const league: any = await League.findOne({
    goalServeLeagueId: getstanding?.data?.standings?.category?.id,
  });
  getstanding?.data?.standings?.category?.league?.map((item: any) => {
    item.division.map((div: any) => {
      div.team.map(async (team: any) => {
        const teamId: any = await TeamNHL.findOne({
          goalServeTeamId: team.id,
        });
        let data = {
          leagueId: league?.id,
          leagueType: item?.name,
          goalServeLeagueId: getstanding?.data?.standings?.category?.id,
          division: div?.name,
          teamId: teamId?.id,
          goalServeTeamId: teamId?.goalServeTeamId,
          difference: team.difference,
          games_played: team.games_played,
          goals_against: team.goals_against,
          goals_for: team.goals_for,
          home_record: team.home_record,
          last_ten: team.last_ten,
          ot_losses: team.ot_losses,
          points: team.points,
          regular_ot_wins: team.regular_ot_wins,
          road_record: team.road_record,
          shootout_losses: team.shootout_losses,
          shootout_wins: team.shootout_wins,
          streak: team.streak,
          pct: +(
            (Number(team.won) * 100) /
            (Number(team.won) + Number(team.lost))
          ).toFixed(3),
          lost: team.lost,
          name: team.name,
          position: team.position,
          won: team.won,
        };
        const standingData = new NhlStandings(data);
        await standingData.save();
      });
    });
  });
};

const getNHLStandingData = async () => {
  const getStandingData = await NhlStandings.aggregate([
    {
      $lookup: {
        from: "nhlteamimages",
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
      $group: {
        _id: { leagueType: "$leagueType", division: "$division" },
        teams: {
          $push: {
            id: { $toString: "$goalServeTeamId" },
            games_played: "$games_played",
            won: "$won",
            lost: "$lost",
            ot_losses: "$ot_losses",
            points: "$points",
            regular_ot_wins: "$regular_ot_wins",
            shootout_losses: "$shootout_losses",
            shootout_wins: "$shootout_wins",
            difference: "$difference",
            goals_against: "$goals_against",
            goals_for: "$goals_for",
            road_record: "$road_record",
            name: "$name",
            teamImage: "$images.image",
            pct: "$pct",
            streak: "$streak",
            home_record: "$home_record",
            last_ten: "$last_ten",
            rw: {
              $subtract: [
                { $toInt: "$regular_ot_wins" },
                {
                  $subtract: [{ $toInt: "$lost" }, { $toInt: "$ot_losses" }],
                },
              ],
            },
          },
        },
      },
    },

    {
      $group: {
        _id: null,

        conference: {
          $push: {
            name: {
              $let: {
                vars: {
                  words: { $split: ["$_id.leagueType", " "] },
                },
                in: {
                  $cond: [
                    { $eq: [{ $size: "$$words" }, 1] },
                    { $toUpper: { $arrayElemAt: ["$$words", 0] } },
                    { $toUpper: { $arrayElemAt: ["$$words", 0] } },
                  ],
                },
              },
            },
            teams: "$teams",
          },
        },
        division: {
          $push: {
            name: {
              $let: {
                vars: {
                  words: { $split: ["$_id.division", " "] },
                },
                in: {
                  $cond: [
                    { $eq: [{ $size: "$$words" }, 1] },
                    { $toUpper: { $arrayElemAt: ["$$words", 0] } },
                    { $toUpper: { $arrayElemAt: ["$$words", 0] } },
                  ],
                },
              },
            },
            teams: "$teams",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        conference: 1,
        division: 1,
      },
    },
  ]);

  const mergedObject: any = getStandingData[0].conference.reduce(
    (result: any, current: any) => {
      if (result[current.name]) {
        result[current.name].teams.push(...current.teams);
      } else {
        result[current.name] = current;
      }
      return result;
    },
    {}
  );
  getStandingData[0].conference = Object.values(mergedObject);

  return getStandingData[0];
};

const nhlSingleGameBoxScore = async (params: any) => {
  const goalServeMatchId = params.goalServeMatchId;
  const getMatch = await NhlMatch.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },

    {
      $lookup: {
        from: "nhlteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nhlteams",
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
        from: "nhlstandings",
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
        from: "nhlstandings",
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
        from: "nhlteamimages",
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
        from: "nhlteamimages",
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
          $toInt: "$awayTeamTotalScore",
        },
        homeTeamTotalScoreInNumber: {
          $toInt: "$homeTeamTotalScore",
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
        awayTeam: {
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
        scoringSummary: {
          scoringFirstperiod: "$scoringFirstperiod",
          scoringSecondperiod: "$scoringSecondperiod",
          scoringThirdperiod: "$scoringThirdperiod",
        },
        penaltySummary: {
          penaltiesFirstperiod: "$penaltiesFirstperiod",
          penaltiesSecondperiod: "$penaltiesSecondperiod",
          penaltiesThirdperiod: "$penaltiesThirdperiod",
        },
        goalKeeperReasult: {
          homeTeam: "$goalkeeperStatsHomeTeam",
          awayTeam: "$goalkeeperStatsAwayTeam",
        },
        teamStatistics: {
          homeTeam: {
            faceoffs_won: "$teamStatsHomeTeam.faceoffs_won.total",
            giveaways: "$teamStatsHomeTeam.giveaways.total",
            hits: "$teamStatsHomeTeam.hits.total",
            penalty_minutes: "$teamStatsHomeTeam.penalty_minutes.total",
            shots: "$teamStatsHomeTeam.shots.total",
            takeaways: "$teamStatsHomeTeam.takeaways.total",
          },
          awayTeam: {
            faceoffs_won: "$teamStatsAwayTeam.faceoffs_won.total",
            giveaways: "$teamStatsAwayTeam.giveaways.total",
            hits: "$teamStatsAwayTeam.hits.total",
            penalty_minutes: "$teamStatsAwayTeam.penalty_minutes.total",
            shots: "$teamStatsAwayTeam.shots.total",
            takeaways: "$teamStatsAwayTeam.takeaways.total",
          },
        },
      },
    },
  ]);
  return { getMatch: getMatch[0] };
};

const addMatchDataFutureForNhl = async () => {
  try {
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
    var daylist = getDaysArray(new Date("2023-05-25"), new Date("2023-05-31"));
    for (let i = 0; i < daylist?.length; i++) {
      const getMatch = await axiosGet(
        `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/hockey/nhl-shedule`,
        { json: true, date1: daylist[i] }
      );
      const matchArray = await getMatch?.data?.shedules?.matches?.match;
      const league: any = await League.findOne({
        goalServeLeagueId: getMatch?.data?.shedules?.id,
      });
      var savedMatchData: any = "";
      if (matchArray?.length > 0 && matchArray) {
        // array logic
        for (let j = 0; j < matchArray?.length; j++) {
          const data: any = {
            leagueId: league.id,
            goalServeLeagueId: league.goalServeLeagueId,
            date: matchArray[j].date,
            formattedDate: matchArray[j].formatted_date,
            timezone: matchArray[j].timezone,
            attendance: matchArray[j].attendance,
            goalServeMatchId: matchArray[j].id,
            dateTimeUtc: matchArray[j].datetime_utc,
            status: matchArray[j].status,
            time: matchArray[j].time,
            goalServeVenueId: matchArray[j].venue_id,
            venueName: matchArray[j].venue_name,
            homeTeamTotalScore: matchArray[j].hometeam.totalscore,
            awayTeamTotalScore: matchArray[j].awayteam.totalscore,
            // new entries
            timer: matchArray[j]?.timer ? matchArray[j]?.timer : "",
            isPp: matchArray[j]?.is_pp ? matchArray[j]?.is_pp : "",
            ppTime: matchArray[j]?.pp_time ? matchArray[j]?.pp_time : "",
            awayTeamOt: matchArray[j].awayteam.ot,
            awayTeamP1: matchArray[j].awayteam.p1,
            awayTeamP2: matchArray[j].awayteam.p2,
            awayTeamP3: matchArray[j].awayteam.p3,
            awayTeamPp: matchArray[j].awayteam.pp,
            awayTeamSo: matchArray[j].awayteam.so,

            homeTeamOt: matchArray[j].hometeam.ot,
            homeTeamP1: matchArray[j].hometeam.p1,
            homeTeamP2: matchArray[j].hometeam.p2,
            homeTeamP3: matchArray[j].hometeam.p3,
            homeTeamPp: matchArray[j].hometeam.pp,
            homeTeamSo: matchArray[j].hometeam.so,

            scoringFirstperiod: matchArray[j]?.scoring?.firstperiod?.event
              ? matchArray[j]?.scoring?.firstperiod?.event
              : [],
            scoringOvertime: matchArray[j]?.scoring?.overtime?.event
              ? matchArray[j]?.scoring?.overtime?.event
              : [],
            scoringSecondperiod: matchArray[j]?.scoring?.secondperiod?.event
              ? matchArray[j]?.scoring?.secondperiod?.event
              : [],
            scoringShootout: matchArray[j]?.scoring?.shootout?.event
              ? matchArray[j]?.scoring?.shootout?.event
              : [],
            scoringThirdperiod: matchArray[j]?.scoring?.thirdperiod?.event
              ? matchArray[j]?.scoring?.thirdperiod?.event
              : [],

            penaltiesFirstperiod: matchArray[j]?.penalties?.firstperiod?.penalty
              ? matchArray[j]?.penalties?.firstperiod?.penalty
              : [],
            penaltiesOvertime: matchArray[j]?.penalties?.overtime?.penalty
              ? matchArray[j]?.penalties?.overtime?.penalty
              : [],
            penaltiesSecondperiod: matchArray[j]?.penalties?.secondperiod
              ?.penalty
              ? matchArray[j]?.penalties?.secondperiod?.penalty
              : [],
            penaltiesThirdperiod: matchArray[j]?.penalties?.thirdperiod?.penalty
              ? matchArray[j]?.penalties?.thirdperiod?.penalty
              : [],

            teamStatsHomeTeam: matchArray[j]?.team_stats?.hometeam
              ? matchArray[j]?.team_stats?.hometeam
              : {},
            teamStatsAwayTeam: matchArray[j]?.team_stats?.awayteam
              ? matchArray[j]?.team_stats?.awayteam
              : {},

            playerStatsAwayTeam: matchArray[j]?.player_stats?.awayteam?.player
              ? matchArray[j]?.player_stats?.awayteam?.player
              : [],
            playerStatsHomeTeam: matchArray[j]?.player_stats?.hometeam?.player
              ? matchArray[j]?.player_stats?.hometeam?.player
              : [],

            powerPlayAwayTeam: matchArray[j]?.powerplay?.awayteam
              ? matchArray[j]?.powerplay?.awayteam
              : {},
            powerPlayHomeTeam: matchArray[j]?.powerplay?.hometeam
              ? matchArray[j]?.powerplay?.hometeam
              : {},

            goalkeeperStatsAwayTeam: matchArray[j]?.goalkeeper_stats?.awayteam
              ?.player
              ? matchArray[j]?.goalkeeper_stats?.awayteam?.player
              : [],
            goalkeeperStatsHomeTeam: matchArray[j]?.goalkeeper_stats?.hometeam
              ?.player
              ? matchArray[j]?.goalkeeper_stats?.hometeam?.player
              : [],
          };

          const teamIdAway: any = await TeamNHL.findOne({
            goalServeTeamId: matchArray[j].awayteam.id,
          });

          data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 1;

          const teamIdHome: any = await TeamNHL.findOne({
            goalServeTeamId: matchArray[j].hometeam.id,
          });

          data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 1;
          const matchData = new NhlMatch(data);
          savedMatchData = await matchData.save();
        }
      } else {
        if (matchArray) {
          const data: any = {
            leagueId: league.id,
            goalServeLeagueId: league.goalServeLeagueId,
            date: matchArray.date,
            formattedDate: matchArray.formatted_date,
            timezone: matchArray.timezone,
            attendance: matchArray.attendance,
            goalServeMatchId: matchArray.id,
            dateTimeUtc: matchArray.datetime_utc,
            status: matchArray.status,
            time: matchArray.time,
            goalServeVenueId: matchArray.venue_id,
            venueName: matchArray.venue_name,
            homeTeamTotalScore: matchArray.hometeam.totalscore,
            awayTeamTotalScore: matchArray.awayteam.totalscore,
            // new entries
            timer: matchArray?.timer ? matchArray?.timer : "",
            isPp: matchArray?.is_pp ? matchArray?.is_pp : "",
            ppTime: matchArray?.pp_time ? matchArray?.pp_time : "",
            awayTeamOt: matchArray.awayteam.ot,
            awayTeamP1: matchArray.awayteam.p1,
            awayTeamP2: matchArray.awayteam.p2,
            awayTeamP3: matchArray.awayteam.p3,
            awayTeamPp: matchArray.awayteam.pp,
            awayTeamSo: matchArray.awayteam.so,

            homeTeamOt: matchArray.hometeam.ot,
            homeTeamP1: matchArray.hometeam.p1,
            homeTeamP2: matchArray.hometeam.p2,
            homeTeamP3: matchArray.hometeam.p3,
            homeTeamPp: matchArray.hometeam.pp,
            homeTeamSo: matchArray.hometeam.so,

            scoringFirstperiod: matchArray?.scoring?.firstperiod?.event
              ? matchArray?.scoring?.firstperiod?.event
              : [],
            scoringOvertime: matchArray?.scoring?.overtime?.event
              ? matchArray?.scoring?.overtime?.event
              : [],
            scoringSecondperiod: matchArray?.scoring?.secondperiod?.event
              ? matchArray?.scoring?.secondperiod?.event
              : [],
            scoringShootout: matchArray?.scoring?.shootout?.event
              ? matchArray?.scoring?.shootout?.event
              : [],
            scoringThirdperiod: matchArray?.scoring?.thirdperiod?.event
              ? matchArray?.scoring?.thirdperiod?.event
              : [],

            penaltiesFirstperiod: matchArray?.penalties?.firstperiod?.penalty
              ? matchArray?.penalties?.firstperiod?.penalty
              : [],
            penaltiesOvertime: matchArray?.penalties?.overtime?.penalty
              ? matchArray?.penalties?.overtime?.penalty
              : [],
            penaltiesSecondperiod: matchArray?.penalties?.secondperiod?.penalty
              ? matchArray?.penalties?.secondperiod?.penalty
              : [],
            penaltiesThirdperiod: matchArray?.penalties?.thirdperiod?.penalty
              ? matchArray?.penalties?.thirdperiod?.penalty
              : [],

            teamStatsHomeTeam: matchArray?.team_stats?.hometeam
              ? matchArray?.team_stats?.hometeam
              : {},
            teamStatsAwayTeam: matchArray?.team_stats?.awayteam
              ? matchArray?.team_stats?.awayteam
              : {},

            playerStatsAwayTeam: matchArray?.player_stats?.awayteam?.player
              ? matchArray?.player_stats?.awayteam?.player
              : [],
            playerStatsHomeTeam: matchArray?.player_stats?.hometeam?.player
              ? matchArray?.player_stats?.hometeam?.player
              : [],

            powerPlayAwayTeam: matchArray?.powerplay?.awayteam
              ? matchArray?.powerplay?.awayteam
              : {},
            powerPlayHomeTeam: matchArray?.powerplay?.hometeam
              ? matchArray?.powerplay?.hometeam
              : {},

            goalkeeperStatsAwayTeam: matchArray?.goalkeeper_stats?.awayteam
              ?.player
              ? matchArray?.goalkeeper_stats?.awayteam?.player
              : [],
            goalkeeperStatsHomeTeam: matchArray?.goalkeeper_stats?.hometeam
              ?.player
              ? matchArray?.goalkeeper_stats?.hometeam?.player
              : [],
          };

          const teamIdAway: any = await TeamNHL.findOne({
            goalServeTeamId: matchArray.awayteam.id,
          });
          if (teamIdAway) {
            data.awayTeamId = teamIdAway.id;
            data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
              ? teamIdAway.goalServeTeamId
              : 0;
          }
          const teamIdHome: any = await TeamNHL.findOne({
            goalServeTeamId: matchArray.hometeam.id,
          });
          if (teamIdHome) {
            data.homeTeamId = teamIdHome.id;
            data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
              ? teamIdHome.goalServeTeamId
              : 0;
          }
          const matchData = new NhlMatch(data);
          savedMatchData = await matchData.save();
        }
      }
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
};

const nhlScoreWithDate = async (params: any, type: string) => {
  const getUpcomingMatch = await NhlMatch.aggregate([
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
          $toDate: {
            $arrayElemAt: ["$spliteTime", 0],
          },
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
        dateInString: params.date1,
        status: "Not Started",
      },
    },
    {
      $lookup: {
        from: "nhlteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nhlteams",
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
        from: "nhlstandings",
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
        from: "nhlstandings",
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
        from: "nhlteamimages",
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
        from: "nhlteamimages",
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
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
          goalServeAwayTeamId: "$goalServeAwayTeamId",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
          goalServeHomeTeamId: "$goalServeHomeTeamId",
        },
      },
    },
  ]);

  const getFinalMatch = await NhlMatch.aggregate([
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
          $toDate: {
            $arrayElemAt: ["$spliteTime", 0],
          },
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
        dateInString: params.date1,
        $or: [
          {
            status: {
              $eq: "Final",
            },
          },
          {
            status: {
              $eq: "After Over Time",
            },
          },
          {
            status: {
              $eq: "End Of Period",
            },
          },
          {
            status: {
              $eq: "After Penalties",
            },
          },
          {
            status: {
              $eq: "Final/4OT",
            },
          },
          {
            status: {
              $eq: "1st",
            },
          },
          {
            status: {
              $eq: "2nd",
            },
          },
          {
            status: {
              $eq: "3rd",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "nhlteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nhlteams",
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
        from: "nhlstandings",
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
        from: "nhlstandings",
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
        from: "nhlteamimages",
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
        from: "nhlteamimages",
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
          $toInt: "$awayTeamTotalScore",
        },
        homeTeamTotalScoreInNumber: {
          $toInt: "$homeTeamTotalScore",
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
          awayTeamRun: "$awayTeamTotalScore",
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
          goalServeAwayTeamId: "$goalServeAwayTeamId",
        },
        'homeTeam': {
          'homeTeamName': '$homeTeam.name',
          'homeTeamId': '$homeTeam._id',
          'homeTeamRun': '$homeTeamTotalScore',
          'won': '$homeTeamStandings.won',
          'lose': '$homeTeamStandings.lost',
          'teamImage': '$homeTeamImage.image',
          'isWinner': {
            '$cond': {
              'if': {
                '$gte': [
                  '$homeTeamTotalScoreInNumber', '$awayTeamTotalScoreInNumber'
                ]
              },
              then: true,
              else: false,
            },
          },
          goalServeHomeTeamId: "$goalServeHomeTeamId",
        },
      },
    },
  ]);
  if (type) {
    if (type == "final") {
      return getFinalMatch;
    } else {
      return getUpcomingMatch;
    }
  } else {
    return { getUpcomingMatch, getFinalMatch };
  }
};
const getLiveDataOfNhl = async (params: any) => {
  const getLiveDataOfNhl = await NhlMatch.aggregate([
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
              $ne: "After Over Time",
            },
          },
          {
            status: {
              $ne: "Postponed",
            },
          },
          {
            status: {
              $ne: "After Penalties",
            },
          },
          {
            status: {
              $ne: "Final/4OT",
            },
          },
        ],
      },
    },
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
          $toDate: {
            $arrayElemAt: ["$spliteTime", 0],
          },
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
    // {
    //   '$match': {
    //     'dateInString': params.date1
    //   }
    // },
    {
      $lookup: {
        from: "nhlteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nhlteams",
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
        from: "nhlstandings",
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
        from: "nhlstandings",
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
        from: "nhlteamimages",
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
        from: "nhlteamimages",
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
          $toInt: "$awayTeamTotalScore",
        },
        homeTeamTotalScoreInNumber: {
          $toInt: "$homeTeamTotalScore",
        },
        statusWithPeriod: {
          $regexMatch: {
            input: "$status",
            regex: new RegExp("[0-9]"),
          },
        },
      },
    },
    {
      $addFields: {
        statusWithCondition: {
          $cond: {
            if: {
              $eq: ["$statusWithPeriod", true],
            },
            then: {
              $concat: ["Period ", "", "$status"],
            },
            else: "Overtime",
          },
        },
      },
    },
    {
      $sort: {
        datetime_utc: 1,
      },
    },
    {
      $project: {
        id: true,
        date: true,
        status: "$statusWithCondition",
        datetime_utc: "$dateTimeUtc",
        time: true,
        goalServeMatchId: true,
        timer: "$timer",
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
          goalServeAwayTeamId: "$goalServeAwayTeamId",
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
          homeTeamRun: "$homeTeamTotalScore",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
          goalServeHomeTeamId: "$goalServeHomeTeamId",
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
  await socket("nhlLiveMatch", {
    getLiveDataOfNhl,
  });
  return getLiveDataOfNhl;
};
const nhlScoreWithCurrentDate = async (params: any) => {
  return {
    getLiveMatch: await getLiveDataOfNhl(params),
    getUpcomingMatch: await nhlScoreWithDate(params, "upcoming"),
    getFinalMatch: await nhlScoreWithDate(params, "final"),
  };
};
const nhlGetTeam = async (params: any) => {
  const goalServeTeamId = params.goalServeTeamId;
  const getTeam = await NhlStandings.aggregate([
    {
      $match: {
        goalServeTeamId: Number(goalServeTeamId),
      },
    },
    {
      $lookup: {
        from: "nhlteamimages",
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
        from: "nhlstandings",
        let: { parentDivision: "$division" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$division", "$$parentDivision"] },
            },
          },
          {
            $project: {
              name: true,
              won: true,
              lost: true,
              games_played: true,
              ot_losses: true,
              points: true,
              goals_for: true,
              goals_against: true,
            },
          },
        ],
        as: "divisionStandings",
      },
    },

    {
      $lookup: {
        from: "nhlinjuries",
        localField: "goalServeTeamId",
        foreignField: "goalServeTeamId",
        as: "teamInjuredPlayers",
      },
    },

    {
      $lookup: {
        from: "nhlmatches",
        let: { goalServeTeamId: "$goalServeTeamId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $or: [
                      { $eq: ["$goalServeAwayTeamId", "$$goalServeTeamId"] },
                      { $eq: ["$goalServeHomeTeamId", "$$goalServeTeamId"] },
                    ],
                  },
                  { $eq: ["$status", "Final"] },
                ],
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
                $toInt: "$awayTeamTotalScore",
              },
              homeTeamTotalScoreInNumber: {
                $toInt: "$homeTeamTotalScore",
              },
            },
          },
          {
            $sort: { dateUtc: -1 },
          },
          {
            $limit: 5,
          },
        ],
        as: "schedule",
      },
    },
    {
      $lookup: {
        from: "nhlplayers",
        let: { goalServeTeamId: "$goalServeTeamId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$goalServeTeamId", "$$goalServeTeamId"] },
            },
          },
          {
            $addFields: {
              goals: { $toInt: "$goals" },
              assists: { $toInt: "$assists" },
              points: { $toInt: "$points" },
            },
          },
          {
            $facet: {
              maxGoalScorer: [{ $sort: { goals: -1 } }, { $limit: 1 }],
              maxAssistProvider: [{ $sort: { assists: -1 } }, { $limit: 1 }],
              maxPointsEarned: [{ $sort: { points: -1 } }, { $limit: 1 }],
            },
          },
          {
            $project: {
              maxGoalScorer: { $arrayElemAt: ["$maxGoalScorer", 0] },
              maxAssistProvider: { $arrayElemAt: ["$maxAssistProvider", 0] },
              maxPointsEarned: { $arrayElemAt: ["$maxPointsEarned", 0] },
            },
          },
          {
            $project: {
              maxAssistProvider: {
                assists: "$maxAssistProvider.assists",
                name: "$maxAssistProvider.name",
              },
              maxGoalScorer: {
                goals: "$maxGoalScorer.goals",
                name: "$maxGoalScorer.name",
              },
              maxPointsEarned: {
                points: "$maxPointsEarned.points",
                name: "$maxPointsEarned.name",
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
        from: "nhlplayers",
        localField: "goalServeTeamId",
        foreignField: "goalServeTeamId",
        as: "teamPlayers",
      },
    },
    {
      $addFields: {
        positions: {
          $setUnion: "$teamPlayers.position",
        },
      },
    },

    {
      $project: {
        id: true,
        goalServeTeamId: true,
        teamImage: "$images.image",
        name: true,
        won: true,
        lost: true,
        ot_losses: true,
        division: true,
        last_ten: {
          $arrayElemAt: [{ $split: ["$last_ten", ","] }, 0],
        },
        streak: true,
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
                      cond: { $eq: ["$$player.position", "$$pos"] },
                    },
                  },
                  as: "player",
                  in: {
                    name: "$$player.name",
                    height: "$$player.height",
                    weight: "$$player.weight",
                    birthplace: "$$player.birth_place",
                    age: "$$player.age",
                    shot: "$$player.shot",
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
          teamLeaders: "$teamLeaders",
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
                      $gte: [
                        "$$item.homeTeamTotalScoreInNumber",
                        "$$item.awayTeamTotalScoreInNumber",
                      ],
                    },
                    then: true,
                    else: false,
                  },
                },
                goalServeMatchId: "$$item.goalServeMatchId",
                date: "$$item.date",
                goalServeHomeTeamId: "$$item.goalServeHomeTeamId",
                goalServeAwayTeamId: "$$item.goalServeAwayTeamId",
              },
            },
          },
        },
      },
    },
  ]);
  return getTeam[0];
};

const updateCurruntDateRecordNhl = async () => {
  try {
    const getMatch = await axiosGet(
      `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/hockey/nhl-scores`,
      { json: true }
    );
    const matchArray = await getMatch?.data?.scores?.category?.match;
    const league: any = await League.findOne({
      goalServeLeagueId: getMatch?.data.scores.category.id,
    });
    var savedMatchData: any = "";
    if (matchArray?.length > 0 && matchArray) {
      // array logic
      for (let j = 0; j < matchArray?.length; j++) {
        const data: any = {
          leagueId: league.id,
          goalServeLeagueId: league.goalServeLeagueId,
          date: matchArray[j].date,
          formattedDate: matchArray[j].formatted_date,
          timezone: matchArray[j].timezone,
          attendance: matchArray[j].attendance,
          goalServeMatchId: matchArray[j].id,
          dateTimeUtc: matchArray[j].datetime_utc,
          status: matchArray[j].status,
          time: matchArray[j].time,
          goalServeVenueId: matchArray[j].venue_id,
          venueName: matchArray[j].venue_name,
          homeTeamTotalScore: matchArray[j].hometeam.totalscore,
          awayTeamTotalScore: matchArray[j].awayteam.totalscore,
          // new entries
          timer: matchArray[j]?.timer ? matchArray[j]?.timer : "",
          isPp: matchArray[j]?.is_pp ? matchArray[j]?.is_pp : "",
          ppTime: matchArray[j]?.pp_time ? matchArray[j]?.pp_time : "",
          awayTeamOt: matchArray[j].awayteam.ot,
          awayTeamP1: matchArray[j].awayteam.p1,
          awayTeamP2: matchArray[j].awayteam.p2,
          awayTeamP3: matchArray[j].awayteam.p3,
          awayTeamPp: matchArray[j].awayteam.pp,
          awayTeamSo: matchArray[j].awayteam.so,

          homeTeamOt: matchArray[j].hometeam.ot,
          homeTeamP1: matchArray[j].hometeam.p1,
          homeTeamP2: matchArray[j].hometeam.p2,
          homeTeamP3: matchArray[j].hometeam.p3,
          homeTeamPp: matchArray[j].hometeam.pp,
          homeTeamSo: matchArray[j].hometeam.so,

          scoringFirstperiod: matchArray[j]?.scoring?.firstperiod?.event
            ? matchArray[j]?.scoring?.firstperiod?.event
            : [],
          scoringOvertime: matchArray[j]?.scoring?.overtime?.event
            ? matchArray[j]?.scoring?.overtime?.event
            : [],
          scoringSecondperiod: matchArray[j]?.scoring?.secondperiod?.event
            ? matchArray[j]?.scoring?.secondperiod?.event
            : [],
          scoringShootout: matchArray[j]?.scoring?.shootout?.event
            ? matchArray[j]?.scoring?.shootout?.event
            : [],
          scoringThirdperiod: matchArray[j]?.scoring?.thirdperiod?.event
            ? matchArray[j]?.scoring?.thirdperiod?.event
            : [],

          penaltiesFirstperiod: matchArray[j]?.penalties?.firstperiod?.penalty
            ? matchArray[j]?.penalties?.firstperiod?.penalty
            : [],
          penaltiesOvertime: matchArray[j]?.penalties?.overtime?.penalty
            ? matchArray[j]?.penalties?.overtime?.penalty
            : [],
          penaltiesSecondperiod: matchArray[j]?.penalties?.secondperiod?.penalty
            ? matchArray[j]?.penalties?.secondperiod?.penalty
            : [],
          penaltiesThirdperiod: matchArray[j]?.penalties?.thirdperiod?.penalty
            ? matchArray[j]?.penalties?.thirdperiod?.penalty
            : [],

          teamStatsHomeTeam: matchArray[j]?.team_stats?.hometeam
            ? matchArray[j]?.team_stats?.hometeam
            : {},
          teamStatsAwayTeam: matchArray[j]?.team_stats?.awayteam
            ? matchArray[j]?.team_stats?.awayteam
            : {},

          playerStatsAwayTeam: matchArray[j]?.player_stats?.awayteam?.player
            ? matchArray[j]?.player_stats?.awayteam?.player
            : [],
          playerStatsHomeTeam: matchArray[j]?.player_stats?.hometeam?.player
            ? matchArray[j]?.player_stats?.hometeam?.player
            : [],

          powerPlayAwayTeam: matchArray[j]?.powerplay?.awayteam
            ? matchArray[j]?.powerplay?.awayteam
            : {},
          powerPlayHomeTeam: matchArray[j]?.powerplay?.hometeam
            ? matchArray[j]?.powerplay?.hometeam
            : {},

          goalkeeperStatsAwayTeam: matchArray[j]?.goalkeeper_stats?.awayteam
            ?.player
            ? matchArray[j]?.goalkeeper_stats?.awayteam?.player
            : [],
          goalkeeperStatsHomeTeam: matchArray[j]?.goalkeeper_stats?.hometeam
            ?.player
            ? matchArray[j]?.goalkeeper_stats?.hometeam?.player
            : [],
        };

        const teamIdAway: any = await TeamNHL.findOne({
          goalServeTeamId: matchArray[j].awayteam.id,
        });

        data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
          ? teamIdAway.goalServeTeamId
          : 1;

        const teamIdHome: any = await TeamNHL.findOne({
          goalServeTeamId: matchArray[j].hometeam.id,
        });

        data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
          ? teamIdHome.goalServeTeamId
          : 1;

        // const matchData = new NhlMatch(data);
        console.log("data.status", data);
        const recordUpdate = await Match.findOneAndUpdate(
          { goalServeMatchId: data.goalServeMatchId },
          { $set: data },
          { new: true }
        );
      }
    } else {
      if (matchArray) {
        const data: any = {
          leagueId: league.id,
          goalServeLeagueId: league.goalServeLeagueId,
          date: matchArray.date,
          formattedDate: matchArray.formatted_date,
          timezone: matchArray.timezone,
          attendance: matchArray.attendance,
          goalServeMatchId: matchArray.id,
          dateTimeUtc: matchArray.datetime_utc,
          status: matchArray.status,
          time: matchArray.time,
          goalServeVenueId: matchArray.venue_id,
          venueName: matchArray.venue_name,
          homeTeamTotalScore: matchArray.hometeam.totalscore,
          awayTeamTotalScore: matchArray.awayteam.totalscore,
          // new entries
          timer: matchArray?.timer ? matchArray?.timer : "",
          isPp: matchArray?.is_pp ? matchArray?.is_pp : "",
          ppTime: matchArray?.pp_time ? matchArray?.pp_time : "",
          awayTeamOt: matchArray.awayteam.ot,
          awayTeamP1: matchArray.awayteam.p1,
          awayTeamP2: matchArray.awayteam.p2,
          awayTeamP3: matchArray.awayteam.p3,
          awayTeamPp: matchArray.awayteam.pp,
          awayTeamSo: matchArray.awayteam.so,

          homeTeamOt: matchArray.hometeam.ot,
          homeTeamP1: matchArray.hometeam.p1,
          homeTeamP2: matchArray.hometeam.p2,
          homeTeamP3: matchArray.hometeam.p3,
          homeTeamPp: matchArray.hometeam.pp,
          homeTeamSo: matchArray.hometeam.so,

          scoringFirstperiod: matchArray?.scoring?.firstperiod?.event
            ? matchArray?.scoring?.firstperiod?.event
            : [],
          scoringOvertime: matchArray?.scoring?.overtime?.event
            ? matchArray?.scoring?.overtime?.event
            : [],
          scoringSecondperiod: matchArray?.scoring?.secondperiod?.event
            ? matchArray?.scoring?.secondperiod?.event
            : [],
          scoringShootout: matchArray?.scoring?.shootout?.event
            ? matchArray?.scoring?.shootout?.event
            : [],
          scoringThirdperiod: matchArray?.scoring?.thirdperiod?.event
            ? matchArray?.scoring?.thirdperiod?.event
            : [],

          penaltiesFirstperiod: matchArray?.penalties?.firstperiod?.penalty
            ? matchArray?.penalties?.firstperiod?.penalty
            : [],
          penaltiesOvertime: matchArray?.penalties?.overtime?.penalty
            ? matchArray?.penalties?.overtime?.penalty
            : [],
          penaltiesSecondperiod: matchArray?.penalties?.secondperiod?.penalty
            ? matchArray?.penalties?.secondperiod?.penalty
            : [],
          penaltiesThirdperiod: matchArray?.penalties?.thirdperiod?.penalty
            ? matchArray?.penalties?.thirdperiod?.penalty
            : [],

          teamStatsHomeTeam: matchArray?.team_stats?.hometeam
            ? matchArray?.team_stats?.hometeam
            : {},
          teamStatsAwayTeam: matchArray?.team_stats?.awayteam
            ? matchArray?.team_stats?.awayteam
            : {},

          playerStatsAwayTeam: matchArray?.player_stats?.awayteam?.player
            ? matchArray?.player_stats?.awayteam?.player
            : [],
          playerStatsHomeTeam: matchArray?.player_stats?.hometeam?.player
            ? matchArray?.player_stats?.hometeam?.player
            : [],

          powerPlayAwayTeam: matchArray?.powerplay?.awayteam
            ? matchArray?.powerplay?.awayteam
            : {},
          powerPlayHomeTeam: matchArray?.powerplay?.hometeam
            ? matchArray?.powerplay?.hometeam
            : {},

          goalkeeperStatsAwayTeam: matchArray?.goalkeeper_stats?.awayteam
            ?.player
            ? matchArray?.goalkeeper_stats?.awayteam?.player
            : [],
          goalkeeperStatsHomeTeam: matchArray?.goalkeeper_stats?.hometeam
            ?.player
            ? matchArray?.goalkeeper_stats?.hometeam?.player
            : [],
        };

        const teamIdAway: any = await TeamNHL.findOne({
          goalServeTeamId: matchArray.awayteam.id,
        });
        if (teamIdAway) {
          data.awayTeamId = teamIdAway.id;
          data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 0;
        }
        const teamIdHome: any = await TeamNHL.findOne({
          goalServeTeamId: matchArray.hometeam.id,
        });
        if (teamIdHome) {
          data.homeTeamId = teamIdHome.id;
          data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 0;
        }
        console.log("data.status", data.goalServeMatchId);
        const recordUpdate = await Match.findOneAndUpdate(
          { goalServeMatchId: data.goalServeMatchId },
          { $set: data },
          { new: true }
        );
        console.log("recordUpdate", recordUpdate);
      }
    }
  } catch (error: any) {
    console.log("error", error);
  }
};



const nhlSingleGameBoxScoreUpcomming = async (params: any) => {
  const goalServeMatchId = params.goalServeMatchId;
  const getMatch = await NhlMatch.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },
    {
      $lookup: {
        from: "nhlteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nhlteams",
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
        from: "nhlstandings",
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
        from: "nhlstandings",
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
        from: "nhlteamimages",
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
        from: "nhlteamimages",
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
        from: "nhlinjuries",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamInjuredPlayers",
      },
    },
    {
      $lookup: {
        from: "nhlinjuries",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamInjuredPlayers",
      },
    },

    {
      $project: {
        id: true,
        attendance: true,
        status: true,
        venueName: true,
        datetime_utc: "$dateTimeUtc",
        awayTeamFullName: "$awayTeam.name",
        homeTeamFullName: "$homeTeam.name",
        awayTeamAbbreviation: "$awayTeam.abbreviation",
        homeTeamAbbreviation: "$homeTeam.abbreviation",
        homeTeamImage: "$homeTeamImage.image",
        awayTeamImage: "$awayTeamImage.image",
        injuredPlayers: {
          awayTeam: "$awayTeamInjuredPlayers",
          homeTeam: "$homeTeamInjuredPlayers",
        },
        awayTeam: {
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam.goalServeTeamId",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
          
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam.goalServeTeamId",
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
  return getMatch[0]
};

// NBA

const createTeamNBA = async (body: any) => {
  let dataJson = {
    json: true,
  };
  const standing = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    dataJson,
    `bsktbl/nba-standings`
  );
  const league = await League.findOne({
    goalServeLeagueId: standing.data.standings.category.id,
  });
  let data: any = {
    goalServeLeagueId: standing.data.standings.category.id,
    leagueId: league?.id,
  };
  for(const league of standing.data.standings.category.league) {
    for(const div of league.division) {
      data.leagueType = league.name;
      data.division = div.name;
      for(const team of div.team) {
        const roaster = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          dataJson,
          `bsktbl/${team.id}_rosters`
        );
        data.name = team.name;
        data.goalServeTeamId = team.id;
        data.abbreviation = roaster.data.team.abbreviation;
        const teamNew = await TeamNBA.create(data);
      }
    }
  }
};

const addNBATeamImage = async (body: any) => {
  let data = {
    teamId: body.teamId,
    goalServeTeamId: body.goalServeTeamId,
    image: body.image,
  };
  const teamNewImage = new TeamImageNBA(data);
  await teamNewImage.save();
};

const addNbaMatch = async () => {
  try {
    let getDaysArray = function (start: any, end: any) {
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
    const daylist = getDaysArray(new Date("2022-10-02"), new Date("2023-05-25"));
    for (let i = 0; i < daylist?.length; i++) {
      try {
        const getMatch = await axiosGet(
          `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-scores`,
          { json: true, date: daylist[i] }
        );
        if (getMatch) {
          const matchArray = await getMatch?.data?.scores?.category?.match;
          const league: any = await League.findOne({
            goalServeLeagueId: getMatch?.data.scores.category.id,
          });
          let savedMatchData: any = "";
          if (matchArray?.length > 0 && matchArray) {
            for (let j = 0; j < matchArray?.length; j++) {
              
              const data: any = {
                leagueId: league._id,
                goalServeLeagueId: league.goalServeLeagueId,
                date: matchArray[j].date,
                formattedDate: matchArray[j].formatted_date,
                dateTimeUtc: matchArray[j].datetime_utc,
                timezone: matchArray[j].timezone,
                attendance: matchArray[j].attendance,
                goalServeMatchId: matchArray[j].id,
                status: matchArray[j].status,
                time: matchArray[j].time,
                timer: matchArray[j]?.timer ? matchArray[j]?.timer : "",
                goalServeVenueId: matchArray[j].venue_id,
                venueName: matchArray[j].venue_name,
                homeTeamTotalScore: matchArray[j].hometeam.totalscore,
                awayTeamTotalScore: matchArray[j].awayteam.totalscore,
                // new entries
                awayTeamOt: matchArray[j].awayteam.ot,
                awayTeamQ1: matchArray[j].awayteam.q1,
                awayTeamQ2: matchArray[j].awayteam.q2,
                awayTeamQ3: matchArray[j].awayteam.q3,
                awayTeamQ4: matchArray[j].awayteam.q4,
                awayTeamPosession: matchArray[j].awayteam.posession,
    
                homeTeamOt: matchArray[j].hometeam.ot,
                homeTeamQ1: matchArray[j].hometeam.q1,
                homeTeamQ2: matchArray[j].hometeam.q2,
                homeTeamQ3: matchArray[j].hometeam.q3,
                homeTeamQ4: matchArray[j].hometeam.q4,
                homeTeamPosession: matchArray[j].hometeam.posession,
    
                teamStatsHomeTeam: matchArray[j]?.team_stats?.hometeam
                  ? matchArray[j]?.team_stats?.hometeam
                  : {},
                teamStatsAwayTeam: matchArray[j]?.team_stats?.awayteam
                  ? matchArray[j]?.team_stats?.awayteam
                  : {},
    
                playerStatsBenchAwayTeam: matchArray[j]?.player_stats?.awayteam?.bench?.player
                  ? matchArray[j]?.player_stats?.awayteam?.bench?.player
                  : [],
                playerStatsBenchHomeTeam: matchArray[j]?.player_stats?.hometeam?.bench?.player
                  ? matchArray[j]?.player_stats?.hometeam?.bench?.player
                  : [],
                playerStatsStartersAwayTeam: matchArray[j]?.player_stats?.awayteam?.starters?.player
                  ? matchArray[j]?.player_stats?.awayteam?.starters?.player
                  : [],
                playerStatsStartersHomeTeam: matchArray[j]?.player_stats?.hometeam?.starters?.player
                  ? matchArray[j]?.player_stats?.hometeam?.starters?.player
                  : [], 
              };
              const teamIdAway: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray[j].awayteam.id,
              });
    
              data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
                ? teamIdAway.goalServeTeamId
                : 1;
    
              const teamIdHome: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray[j].hometeam.id,
              });
    
              data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
                ? teamIdHome.goalServeTeamId
                : 1;
    
              const matchData = new NbaMatch(data);
              savedMatchData = await matchData.save();
            
             }
          } else {
            if (matchArray) {
              const data: any = {
                leagueId: league._id,
                goalServeLeagueId: league.goalServeLeagueId,
                date: matchArray.date,
                formattedDate: matchArray.formatted_date,
                dateTimeUtc: matchArray.datetime_utc,
                timezone: matchArray.timezone,
                attendance: matchArray.attendance,
                goalServematchArrayId: matchArray.id,
                status: matchArray.status,
                time: matchArray.time,
                timer: matchArray?.timer ? matchArray?.timer : "",
                goalServeVenueId: matchArray.venue_id,
                venueName: matchArray.venue_name,
                homeTeamTotalScore: matchArray.hometeam.totalscore,
                awayTeamTotalScore: matchArray.awayteam.totalscore,
                // new entries
                awayTeamOt: matchArray.awayteam.ot,
                awayTeamQ1: matchArray.awayteam.q1,
                awayTeamQ2: matchArray.awayteam.q2,
                awayTeamQ3: matchArray.awayteam.q3,
                awayTeamQ4: matchArray.awayteam.q4,
                awayTeamPosession: matchArray.awayteam.posession,
    
                homeTeamOt: matchArray.hometeam.ot,
                homeTeamQ1: matchArray.hometeam.q1,
                homeTeamQ2: matchArray.hometeam.q2,
                homeTeamQ3: matchArray.hometeam.q3,
                homeTeamQ4: matchArray.hometeam.q4,
                homeTeamPosession: matchArray.hometeam.posession,
    
                teamStatsHomeTeam: matchArray?.team_stats?.hometeam
                  ? matchArray?.team_stats?.hometeam
                  : {},
                teamStatsAwayTeam: matchArray?.team_stats?.awayteam
                  ? matchArray?.team_stats?.awayteam
                  : {},
    
                playerStatsBenchAwayTeam: matchArray?.player_stats?.awayteam?.bench?.player
                  ? matchArray?.player_stats?.awayteam?.bench?.player
                  : [],
                playerStatsBenchHomeTeam: matchArray?.player_stats?.hometeam?.bench?.player
                  ? matchArray?.player_stats?.hometeam?.bench?.player
                  : [],
                playerStatsStartersAwayTeam: matchArray?.player_stats?.awayteam?.starters?.player
                  ? matchArray?.player_stats?.awayteam?.starters?.player
                  : [],
                playerStatsStartersHomeTeam: matchArray?.player_stats?.hometeam?.starters?.player
                  ? matchArray?.player_stats?.hometeam?.starters?.player
                  : [], 
              };
    
              const teamIdAway: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray.awayteam.id,
              });
              if (teamIdAway) {
                data.awayTeamId = teamIdAway.id;
                data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
                  ? teamIdAway.goalServeTeamId
                  : 0;
              }
              const teamIdHome: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray.hometeam.id,
              });
              if (teamIdHome) {
                data.homeTeamId = teamIdHome.id;
                data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
                  ? teamIdHome.goalServeTeamId
                  : 0;
              }
              const matchData = new NbaMatch(data);
              savedMatchData = await matchData.save();
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
};

const addMatchDataFutureForNba = async () => {
  try {
    const getDaysArray = function (start: any, end: any) {
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
    const daylist = getDaysArray(new Date("2023-05-26"), new Date("2023-06-19"));
    for (let i = 0; i < daylist?.length; i++) {
      try {
        const getMatch = await axiosGet(
          `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-shedule`,
          { json: true, date1: daylist[i] }
        );
        if (getMatch) {
          const matchArray = await getMatch?.data?.shedules?.matches?.match;
          const league: any = await League.findOne({
            goalServeLeagueId: getMatch?.data?.shedules?.id,
          });
          console.log(matchArray);

          let savedMatchData: any = "";
          if (matchArray?.length > 0 && matchArray) {            
            // array logic
            for (let j = 0; j < matchArray?.length; j++) {
              const data: any = {
                leagueId: league.id,
                goalServeLeagueId: league.goalServeLeagueId,
                date: matchArray[j].date,
                formattedDate: matchArray[j].formatted_date,
                timezone: matchArray[j].timezone,
                attendance: matchArray[j].attendance,
                goalServeMatchId: matchArray[j].id,
                dateTimeUtc: matchArray[j].datetime_utc,
                status: matchArray[j].status,
                time: matchArray[j].time,
                goalServeVenueId: matchArray[j].venue_id,
                venueName: matchArray[j].venue_name,
                homeTeamTotalScore: matchArray[j].hometeam.totalscore,
                awayTeamTotalScore: matchArray[j].awayteam.totalscore,
                // new entries
                timer: matchArray[j]?.timer ? matchArray[j]?.timer : "",
                awayTeamOt: matchArray[j].awayteam.ot,
                awayTeamQ1: matchArray[j].awayteam.q1,
                awayTeamQ2: matchArray[j].awayteam.q2,
                awayTeamQ3: matchArray[j].awayteam.q3,
                awayTeamQ4: matchArray[j].awayteam.q4,
                awayTeamPosession: matchArray[j].awayteam.posession,
    
                homeTeamOt: matchArray[j].hometeam.ot,
                homeTeamQ1: matchArray[j].hometeam.q1,
                homeTeamQ2: matchArray[j].hometeam.q2,
                homeTeamQ3: matchArray[j].hometeam.q3,
                homeTeamQ4: matchArray[j].hometeam.q4,
                homeTeamPosession: matchArray[j].hometeam.posession,
    
                teamStatsHomeTeam: matchArray[j]?.team_stats?.hometeam
                    ? matchArray[j]?.team_stats?.hometeam
                    : {},
                  teamStatsAwayTeam: matchArray[j]?.team_stats?.awayteam
                    ? matchArray[j]?.team_stats?.awayteam
                    : {},
      
                  playerStatsBenchAwayTeam: matchArray[j]?.player_stats?.awayteam?.bench?.player
                    ? matchArray[j]?.player_stats?.awayteam?.bench?.player
                    : [],
                  playerStatsBenchHomeTeam: matchArray[j]?.player_stats?.hometeam?.bench?.player
                    ? matchArray[j]?.player_stats?.hometeam?.bench?.player
                    : [],
                  playerStatsStartersAwayTeam: matchArray[j]?.player_stats?.awayteam?.starters?.player
                    ? matchArray[j]?.player_stats?.awayteam?.starters?.player
                    : [],
                  playerStatsStartersHomeTeam: matchArray[j]?.player_stats?.hometeam?.starters?.player
                    ? matchArray[j]?.player_stats?.hometeam?.starters?.player
                    : [], 
              };
    
              const teamIdAway: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray[j].awayteam.id,
              });
    
              data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId ? teamIdAway.goalServeTeamId : 1;
    
              const teamIdHome: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray[j].hometeam.id,
              });
    
              data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId ? teamIdHome.goalServeTeamId : 1;
              const matchData = new NbaMatch(data);
              savedMatchData = await matchData.save();
            }
          }
          else {
            if (matchArray) {
              const data: any = {
                leagueId: league._id,
                goalServeLeagueId: league.goalServeLeagueId,
                date: matchArray.date,
                formattedDate: matchArray.formatted_date,
                dateTimeUtc: matchArray.datetime_utc,
                timezone: matchArray.timezone,
                attendance: matchArray.attendance,
                goalServematchArrayId: matchArray.id,
                status: matchArray.status,
                time: matchArray.time,
                timer: matchArray?.timer ? matchArray?.timer : "",
                goalServeVenueId: matchArray.venue_id,
                venueName: matchArray.venue_name,
                homeTeamTotalScore: matchArray.hometeam.totalscore,
                awayTeamTotalScore: matchArray.awayteam.totalscore,
                // new entries
                awayTeamOt: matchArray.awayteam.ot,
                awayTeamQ1: matchArray.awayteam.q1,
                awayTeamQ2: matchArray.awayteam.q2,
                awayTeamQ3: matchArray.awayteam.q3,
                awayTeamQ4: matchArray.awayteam.q4,
                awayTeamPosession: matchArray.awayteam.posession,
    
                homeTeamOt: matchArray.hometeam.ot,
                homeTeamQ1: matchArray.hometeam.q1,
                homeTeamQ2: matchArray.hometeam.q2,
                homeTeamQ3: matchArray.hometeam.q3,
                homeTeamQ4: matchArray.hometeam.q4,
                homeTeamPosession: matchArray.hometeam.posession,
    
                teamStatsHomeTeam: matchArray?.team_stats?.hometeam
                  ? matchArray?.team_stats?.hometeam
                  : {},
                teamStatsAwayTeam: matchArray?.team_stats?.awayteam
                  ? matchArray?.team_stats?.awayteam
                  : {},
    
                playerStatsBenchAwayTeam: matchArray?.player_stats?.awayteam?.bench?.player
                  ? matchArray?.player_stats?.awayteam?.bench?.player
                  : [],
                playerStatsBenchHomeTeam: matchArray?.player_stats?.hometeam?.bench?.player
                  ? matchArray?.player_stats?.hometeam?.bench?.player
                  : [],
                playerStatsStartersAwayTeam: matchArray?.player_stats?.awayteam?.starters?.player
                  ? matchArray?.player_stats?.awayteam?.starters?.player
                  : [],
                playerStatsStartersHomeTeam: matchArray?.player_stats?.hometeam?.starters?.player
                  ? matchArray?.player_stats?.hometeam?.starters?.player
                  : [], 
              };
    
              const teamIdAway: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray.awayteam.id,
              });
              if (teamIdAway) {
                data.awayTeamId = teamIdAway.id;
                data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
                  ? teamIdAway.goalServeTeamId
                  : 0;
              }
              const teamIdHome: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray.hometeam.id,
              });
              if (teamIdHome) {
                data.homeTeamId = teamIdHome.id;
                data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
                  ? teamIdHome.goalServeTeamId
                  : 0;
              }
              const matchData = new NbaMatch(data);
              savedMatchData = await matchData.save();
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
}

const updateCurruntDateRecordNba = async () => {
  try {
    const getMatch = await axiosGet(
      `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-scores`,
      { json: true }
    );
    const matchArray = await getMatch?.data?.scores?.category?.match;
    const league: any = await League.findOne({
      goalServeLeagueId: getMatch?.data.scores.category.id,
    });
    var savedMatchData: any = "";
    if (matchArray?.length > 0 && matchArray) {
      // array logic
      for (let j = 0; j < matchArray?.length; j++) {
        const data: any = {
          leagueId: league._id,
          goalServeLeagueId: league.goalServeLeagueId,
          date: matchArray[j].date,
          formattedDate: matchArray[j].formatted_date,
          dateTimeUtc: matchArray[j].datetime_utc,
          timezone: matchArray[j].timezone,
          attendance: matchArray[j].attendance,
          goalServeMatchId: matchArray[j].id,
          status: matchArray[j].status,
          time: matchArray[j].time,
          timer: matchArray[j]?.timer ? matchArray[j]?.timer : "",
          goalServeVenueId: matchArray[j].venue_id,
          venueName: matchArray[j].venue_name,
          homeTeamTotalScore: matchArray[j].hometeam.totalscore,
          awayTeamTotalScore: matchArray[j].awayteam.totalscore,
          // new entries
          awayTeamOt: matchArray[j].awayteam.ot,
          awayTeamQ1: matchArray[j].awayteam.q1,
          awayTeamQ2: matchArray[j].awayteam.q2,
          awayTeamQ3: matchArray[j].awayteam.q3,
          awayTeamQ4: matchArray[j].awayteam.q4,
          awayTeamPosession: matchArray[j].awayteam.posession,

          homeTeamOt: matchArray[j].hometeam.ot,
          homeTeamQ1: matchArray[j].hometeam.q1,
          homeTeamQ2: matchArray[j].hometeam.q2,
          homeTeamQ3: matchArray[j].hometeam.q3,
          homeTeamQ4: matchArray[j].hometeam.q4,
          homeTeamPosession: matchArray[j].hometeam.posession,

          teamStatsHomeTeam: matchArray[j]?.team_stats?.hometeam
            ? matchArray[j]?.team_stats?.hometeam
            : {},
          teamStatsAwayTeam: matchArray[j]?.team_stats?.awayteam
            ? matchArray[j]?.team_stats?.awayteam
            : {},

          playerStatsBenchAwayTeam: matchArray[j]?.player_stats?.awayteam?.bench?.player
            ? matchArray[j]?.player_stats?.awayteam?.bench?.player
            : [],
          playerStatsBenchHomeTeam: matchArray[j]?.player_stats?.hometeam?.bench?.player
            ? matchArray[j]?.player_stats?.hometeam?.bench?.player
            : [],
          playerStatsStartersAwayTeam: matchArray[j]?.player_stats?.awayteam?.starters?.player
            ? matchArray[j]?.player_stats?.awayteam?.starters?.player
            : [],
          playerStatsStartersHomeTeam: matchArray[j]?.player_stats?.hometeam?.starters?.player
            ? matchArray[j]?.player_stats?.hometeam?.starters?.player
            : [], 
        };
        const teamIdAway: any = await TeamNBA.findOne({
          goalServeTeamId: matchArray[j].awayteam.id,
        });

        data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
          ? teamIdAway.goalServeTeamId
          : 1;

        const teamIdHome: any = await TeamNBA.findOne({
          goalServeTeamId: matchArray[j].hometeam.id,
        });

        data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
          ? teamIdHome.goalServeTeamId
          : 1;
        const recordUpdate = await NbaMatch.findOneAndUpdate(
          { goalServeMatchId: data.goalServeMatchId },
          { $set: data },
          { new: true }
        );
      }
    } else {
      if (matchArray) {
        const data: any = {
          leagueId: league._id,
          goalServeLeagueId: league.goalServeLeagueId,
          date: matchArray.date,
          formattedDate: matchArray.formatted_date,
          dateTimeUtc: matchArray.datetime_utc,
          timezone: matchArray.timezone,
          attendance: matchArray.attendance,
          goalServematchArrayId: matchArray.id,
          status: matchArray.status,
          time: matchArray.time,
          timer: matchArray?.timer ? matchArray?.timer : "",
          goalServeVenueId: matchArray.venue_id,
          venueName: matchArray.venue_name,
          homeTeamTotalScore: matchArray.hometeam.totalscore,
          awayTeamTotalScore: matchArray.awayteam.totalscore,
          // new entries
          awayTeamOt: matchArray.awayteam.ot,
          awayTeamQ1: matchArray.awayteam.q1,
          awayTeamQ2: matchArray.awayteam.q2,
          awayTeamQ3: matchArray.awayteam.q3,
          awayTeamQ4: matchArray.awayteam.q4,
          awayTeamPosession: matchArray.awayteam.posession,

          homeTeamOt: matchArray.hometeam.ot,
          homeTeamQ1: matchArray.hometeam.q1,
          homeTeamQ2: matchArray.hometeam.q2,
          homeTeamQ3: matchArray.hometeam.q3,
          homeTeamQ4: matchArray.hometeam.q4,
          homeTeamPosession: matchArray.hometeam.posession,

          teamStatsHomeTeam: matchArray?.team_stats?.hometeam
            ? matchArray?.team_stats?.hometeam
            : {},
          teamStatsAwayTeam: matchArray?.team_stats?.awayteam
            ? matchArray?.team_stats?.awayteam
            : {},

          playerStatsBenchAwayTeam: matchArray?.player_stats?.awayteam?.bench?.player
            ? matchArray?.player_stats?.awayteam?.bench?.player
            : [],
          playerStatsBenchHomeTeam: matchArray?.player_stats?.hometeam?.bench?.player
            ? matchArray?.player_stats?.hometeam?.bench?.player
            : [],
          playerStatsStartersAwayTeam: matchArray?.player_stats?.awayteam?.starters?.player
            ? matchArray?.player_stats?.awayteam?.starters?.player
            : [],
          playerStatsStartersHomeTeam: matchArray?.player_stats?.hometeam?.starters?.player
            ? matchArray?.player_stats?.hometeam?.starters?.player
            : [], 
        };

        const teamIdAway: any = await TeamNBA.findOne({
          goalServeTeamId: matchArray.awayteam.id,
        });
        if (teamIdAway) {
          data.awayTeamId = teamIdAway.id;
          data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 0;
        }
        const teamIdHome: any = await TeamNBA.findOne({
          goalServeTeamId: matchArray.hometeam.id,
        });
        if (teamIdHome) {
          data.homeTeamId = teamIdHome.id;
          data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 0;
        }
        const recordUpdate = await NbaMatch.findOneAndUpdate(
          { goalServeMatchId: data.goalServeMatchId },
          { $set: data },
          { new: true }
        );
      }
    }
  } catch (error: any) {
    console.log("error", error);
  }
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
  createMatch,
  createMatchStatsApi,
  addStanding,
  singleGameBoxScore,
  addMatchDataFuture,
  getStandingData,
  addMatchWithNewModel,
  singleGameBoxScoreUpcomming,
  addInjuryReport,
  createAndUpdateOdds,
  updateCurruntDateRecord,
  statsPlayerPitching,
  teamStats,
  createTeamNHL,
  addNHLTeamImage,
  addNhlMatch,
  addNhlPlayer,
  addNhlInjuredPlayer,
  addNhlStandings,
  getNHLStandingData,
  nhlSingleGameBoxScore,
  addMatchDataFutureForNhl,
  nhlScoreWithDate,
  nhlScoreWithCurrentDate,
  getLiveDataOfNhl,
  nhlGetTeam,
  nhlSingleGameBoxScoreUpcomming,
  updateCurruntDateRecordNhl,
  createTeamNBA,
  addNBATeamImage,
  addNbaMatch,
  addMatchDataFutureForNba,
  updateCurruntDateRecordNba
};
