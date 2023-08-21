import moment from "moment";
import NflMatch from "../../models/documents/NFL/match.model";
import NflStandings from "../../models/documents/NFL/standings.model";
import League from "../../models/documents/league.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import { axiosGet } from "../../services/axios.service";
import { goalserveApi } from "../../services/goalserve.service";
import INflMatchModel from "../../models/interfaces/nflMatch.interface";

const addStanding = async () => {
  let data = {
    json: true,
  };
  const getstanding = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    `football/nfl-standings`
  );

  const league: ILeagueModel | null = await League.findOne({
    goalServeLeagueId: getstanding?.data?.standings?.category?.id,
  });
  await Promise.all(
    getstanding?.data?.standings?.category?.league?.map(async (item: any) => {
      await Promise.all(
        item.division.map(async (div: any) => {
          await Promise.all(
            div.team.map(async (team: any) => {
              let data = {
                leagueId: league?._id,
                leagueType: item?.name,
                goalServeLeagueId: getstanding?.data?.standings?.category?.id,
                division: div?.name,
                goalServeTeamId: team?.id,
                divisionName: div.name,
                conference_record: team.conference_record,
                division_record: team.division_record,
                difference: team.difference,
                points_against: team.points_against,
                home_record: team.home_record,
                points_for: team.points_for,
                lost: team.lost,
                name: team.name,
                position: team.position,
                road_record: team.road_record,
                streak: team.streak,
                won: team.won,
                ties: team.ties,
                win_percentage: team.win_percentage,
              };
              // console.log(data);
              await NflStandings.findOneAndUpdate(
                { goalServeTeamId: team?.id },
                { $set: data },
                { upsert: true }
              );
            })
          );
        })
      );
    })
  );
};

const getStandings = async () => {
  const getStandingData = await NflStandings.aggregate([
    {
      $lookup: {
        from: "nflteamimages",
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
            won: "$won",
            lost: "$lost",
            ties: "$ties",
            win_percentage: "$win_percentage",
            home_record: "$home_record",
            teamImage: "$images.image",
            road_record: "$road_record",
            division_record: "$division_record",
            conference_record: "$conference_record",
            points_against: "$points_against",
            points_for: "$points_for",
            name: "$name",
            difference: {
              $concat: [
                {
                  $cond: {
                    if: {
                      $gt: [
                        {
                          $subtract: [
                            { $toInt: "$points_for" },
                            { $toInt: "$points_against" },
                          ],
                        },
                        0,
                      ],
                    },
                    then: "+",
                    else: "",
                  },
                },
                {
                  $toString: {
                    $subtract: [
                      { $toInt: "$points_for" },
                      { $toInt: "$points_against" },
                    ],
                  },
                },
              ],
            },

            streak: "$streak",
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
                  $reduce: {
                    input: "$$words",
                    initialValue: "",
                    in: {
                      $concat: [
                        "$$value",
                        { $toUpper: { $substrCP: ["$$this", 0, 1] } },
                      ],
                    },
                  },
                },
              },
            },
            teams: "$teams",
          },
        },
        division: {
          $push: {
            name: {
              $concat: [
                {
                  $reduce: {
                    input: { $split: ["$_id.leagueType", " "] },
                    initialValue: "",
                    in: {
                      $concat: [
                        "$$value",
                        { $toUpper: { $substrCP: ["$$this", 0, 1] } },
                      ],
                    },
                  },
                },
                " ",
                { $toUpper: "$_id.division" },
              ],
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
  for (const conferenceName in mergedObject) {
    mergedObject[conferenceName].teams.sort(
      (team1: any, team2: any) =>
        Number(team2.win_percentage) - Number(team1.win_percentage)
    );
  }
  getStandingData[0].conference = Object.values(mergedObject);
  const sortedDivisions = getStandingData[0].division.map((division: any) => {
    const sortedTeams = division.teams.sort(
      (team1: any, team2: any) =>
        Number(team2.win_percentage) - Number(team1.win_percentage)
    );
    return {
      name: division.name,
      teams: sortedTeams,
    };
  });
  const sortedMergedObject = Object.values(sortedDivisions).sort(
    (team1: any, team2: any) => team1.name.localeCompare(team2.name)
  );
  getStandingData[0].division = sortedMergedObject;
  return getStandingData[0];
};

const getCalendar = async () => {
  const getCalendar = await NflMatch.aggregate([
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
      $sort: {
        dateutc: 1,
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
      $group: {
        _id: {
          weekName: "$weekName",
          seasonName: "$seasonName",
        },
        dates: {
          $push: "$dateTimeUtc",
        },
        dateInString: {
          $push: "$dateInString",
        },
      },
    },
    {
      $group: {
        _id: "$_id.seasonName",
        weekItem: {
          $push: {
            title: "$_id.weekName",
            dates: "$dates",
            dateInString: "$dateInString",
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        weekItem: {
          $sortArray: {
            input: "$weekItem",
            sortBy: {
              dateInString: 1,
            },
          },
        },
      },
    },
  ]);
  return await Promise.all(
    getCalendar.map(async (item: any) => {
      const keyName =
        item._id.charAt(0).toLowerCase() + item._id.slice(1).replace(" ", "");
      return { [keyName]: { title: item._id, weekItem: item.weekItem } };
    })
  );
};

const scoreWithDate = async (data: any) => {
  const getUpcomingMatch = await NflMatch.aggregate([
    {
      $match: {
        seasonName: {
          $in: data.data.map((name:any) => name.seasonName)
        },
        weekName: {
          $in: data.data.map((name:any) => name.weekName)
        },
        status: "Not Started",
      }
      // $match: {
      //   seasonName: data.seasonName,
      //   weekName: data.weekName,
      //   status: "Not Started",
      // },
    },
    {
      $lookup: {
        from: "nflteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nflteams",
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
        from: "nflstandings",
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
        from: "nflstandings",
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
        from: "nflteamimages",
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
        from: "nflteamimages",
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
        from: "nflodds",
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
                  {
                    case: {
                      $eq: [
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
          $cond: {
            if: {
              $or: [
                { $eq: ["$favorite.moneyline", "$underdog.moneyline"] },
                { $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"] },
              ],
            },
            then: {
              $multiply: [
                {
                  $divide: [
                    "$underdog.moneyline",
                    {
                      $add: ["$underdog.moneyline", 100],
                    },
                  ],
                },
                100,
              ],
            },
            else: {
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
      $sort: {
        // formattedDate: 1,
        // time: 1,
        dateTimeUtc: 1,
      },
    },
    // {
    //   $unwind: {
    //     path: "$odds",
    //     includeArrayIndex: "string",
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
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
          spread: "$odds.awayTeamSpread.handicap",
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
          spread: "$odds.homeTeamSpread.handicap",
          total: "$odds.homeTeamTotal",
        },

      },
    },
  ]);
  const getFinalMatch = await NflMatch.aggregate([
    {
      $match: {
        seasonName: {
          $in: data.data.map((name:any) => name.seasonName)
        },
        weekName: {
          $in: data.data.map((name:any) => name.weekName)
        },
        status: "Final",
      },
    },
    // {
    //   $lookup: {
    //     from: "nflteams",
    //     localField: "goalServeAwayTeamId",
    //     foreignField: "goalServeTeamId",
    //     as: "awayTeam",
    //   },
    // },
    // {
    //   $lookup: {
    //     from: "nhlteams",
    //     localField: "goalServeHomeTeamId",
    //     foreignField: "goalServeTeamId",
    //     as: "homeTeam",
    //   },
    // },
    // {
    //   $unwind: {
    //     path: "$awayTeam",
    //     includeArrayIndex: "string",
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
    // {
    //   $unwind: {
    //     path: "$homeTeam",
    //     includeArrayIndex: "string",
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
    {
      $lookup: {
        from: "nflstandings",
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
        from: "nflstandings",
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
        from: "nflteamimages",
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
        from: "nflteamimages",
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
          awayTeamName: "$awayTeamStandings.name",
          awayTeamId: "$awayTeamStandings._id",
          goalServeAwayTeamId: "$awayTeamStandings.goalServeTeamId",
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
        },
        homeTeam: {
          homeTeamName: "$homeTeamStandings.name",
          homeTeamId: "$homeTeamStandings._id",
          goalServeHomeTeamId: "$homeTeamStandings.goalServeTeamId",
          homeTeamRun: "$homeTeamTotalScore",
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

  if (data.type) {
    if (data.type == "final") {
      return getFinalMatch;
    } else {
      return getUpcomingMatch;
    }
  } else {
    return {
      getUpcomingMatch,
      getFinalMatch,
      getLiveDataOfNfl: await getLiveDataOfNfl(data),
    };
  }
};

const addFinalMatch = async (date: any) => {
  var getDaysArray = function (start: Date, end: Date) {
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
  var daylist = getDaysArray(new Date("2023-08-03"), new Date("2023-08-10"));

  for (let i = 0; i < daylist?.length; i++) {
    const getMatch = await axiosGet(
      `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/nfl-scores`,
      { json: true, date: daylist[i] }
    );
    const matchArray = await getMatch?.data?.scores?.category?.match;
    const league: ILeagueModel | undefined | null = await League.findOne({
      goalServeLeagueId: getMatch?.data?.scores?.category?.id,
    });
    if (matchArray?.length > 0 && matchArray) {
      for (let j = 0; j < matchArray?.length; j++) {
        // const data: Partial<INflMatchModel> = {
        //   goalServeLeagueId: league?.goalServeLeagueId,
        //   goalServeMatchId:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.contestID,
        //   attendance:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.attendance,
        //   goalServeHomeTeamId:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.id,
        //   goalServeAwayTeamId:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.id,
        //   date: matchArray[i]?.week[j]?.matches[k]?.date,
        //   dateTimeUtc:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.datetime_utc,
        //   formattedDate:
        //     matchArray[i]?.week[j]?.matches[k]?.formatted_date,
        //   status: matchArray[i]?.week[j]?.matches[k]?.match[l]?.status,
        //   time: matchArray[i]?.week[j]?.matches[k]?.match[l]?.time,
        //   timezone: matchArray[i]?.week[j]?.matches[k]?.timezone,
        //   goalServeVenueId:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.venue_id,
        //   venueName:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.venue,
        //   homeTeamTotalScore:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam
        //       .totalscore,
        //   awayTeamTotalScore:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam
        //       .totalscore,
        //   // new entries
        //   weekName: matchArray[i]?.week[j]?.name,
        //   seasonName: matchArray[i]?.name,
        //   // timer: matchArray[i]?.match[j]?.timer
        //   //   ? matchArray[i]?.match[j]?.timer
        //   //   : "",
        //   awayTeamOt:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.ot,
        //   awayTeamQ1:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.q1,
        //   awayTeamQ2:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.q2,
        //   awayTeamQ3:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.q3,
        //   awayTeamQ4:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.q4,
        //   awayTeamBallOn:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam
        //       .ball_on,
        //   awayTeamDrive:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam
        //       .drive,
        //   awayTeamNumber:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam
        //       .number,
        //   homeTeamOt:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.ot,
        //   homeTeamQ1:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.q1,
        //   homeTeamQ2:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.q2,
        //   homeTeamQ3:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.q3,
        //   homeTeamQ4:
        //     matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.q4,
        //   homeTeamBallOn: matchArray[i]?.week[j]?.matches[k]?.match[l]
        //     ?.awayteam.ball_on
        //     ? matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam
        //         .ball_on
        //     : "",
        //   homeTeamDrive: matchArray[i]?.week[j]?.matches[k]?.match[l]
        //     ?.hometeam.drive
        //     ? matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam
        //         .drive
        //     : "",
        //   homeTeamNumber: matchArray[i]?.week[j]?.matches[k]?.match[l]
        //     ?.hometeam.number
        //     ? matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam
        //         .number
        //     : "",
        // };
        // console.log("data", data);
        // const matchData = new NflMatch(data);
        // await matchData.save();
      }
    } else {
      if (matchArray) {
      }
    }
  }
};

const nflUpcomming = async (goalServeMatchId: string) => {
  try {
    const getMatch = await NflMatch.aggregate([
      {
        $match: {
          goalServeMatchId: Number(goalServeMatchId),
        },
      },
      {
        $lookup: {
          from: "nflteams",
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
          from: "nflstandings",
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
                      points_for: 1,
                      points_against: 1,
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
                      points_for: 1,
                      points_against: 1,
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
          from: "nflteamimages",
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
          from: "nflinjuries",
          localField: "goalServeHomeTeamId",
          foreignField: "goalServeTeamId",
          as: "homeTeamInjuredPlayers",
        },
      },
      {
        $lookup: {
          from: "nflinjuries",
          localField: "goalServeAwayTeamId",
          foreignField: "goalServeTeamId",
          as: "awayTeamInjuredPlayers",
        },
      },
      {
        $lookup: {
          from: "nflplayers",
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
            {
              $sort: {
                "passing.rank": 1,
                "rushing.rank": 1,
                "receiving.rank": 1,
              },
            },
          ],
          as: "players",
        },
      },
      {
        $lookup: {
          from: "nflstatsteams",
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
                      passingTeam: 1,
                      rushingTeam: 1,
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
                      passingTeam: 1,
                      rushingTeam: 1,
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
          from: "nflodds",
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
                    {
                      case: {
                        $eq: [
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
            $cond: {
              if: {
                $or: [
                  { $eq: ["$favorite.moneyline", "$underdog.moneyline"] },
                  { $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"] },
                ],
              },
              then: {
                $multiply: [
                  {
                    $divide: [
                      "$underdog.moneyline",
                      {
                        $add: ["$underdog.moneyline", 100],
                      },
                    ],
                  },
                  100,
                ],
              },
              else: {
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
          goalServeMatchId: true,
          goalServeLeagueId: true,
          datetime_utc: "$dateTimeUtc",
          weekName: "$weekName",
          seasonName: "$seasonName",
          awayTeamFullName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
          homeTeamFullName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },

          awayTeamAbbreviation: {
            $arrayElemAt: ["$teams.awayTeam.abbreviation", 0],
          },
          homeTeamAbbreviation: {
            $arrayElemAt: ["$teams.homeTeam.abbreviation", 0],
          },
          awayTeam: {
            awayTeamName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
            goalServeAwayTeamId: {
              $arrayElemAt: ["$teams.awayTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.awayTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.awayTeam.lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
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
            spread: "$odds.awayTeamSpread.handicap",

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
            spread: "$odds.homeTeamSpread.handicap",

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
          homeTeamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
          awayTeamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
          playerStatistics: {
            awayTeam: {
              passing: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeAwayTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.passing", false] },
                            ],
                          },
                        },
                      },
                      0,
                      2,
                    ],
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
                        interceptions: "$$player.passing.interceptions",
                        sacks: "$$player.passing.sacks",
                        quarterback_rating:
                          "$$player.passing.quarterback_rating",
                        passing_touchdowns:
                          "$$player.passing.passing_touchdowns",
                        yards_per_game: "$$player.passing.yards_per_game",
                        yards: "$$player.passing.yards",
                        completions_by_Attempts: {
                          $concat: [
                            "$$player.passing.completions",
                            "/",
                            "$$player.passing.passing_attempts",
                          ],
                        },
                      },
                    ],
                  },
                },
              },
              rushing: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeHomeTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.rushing", false] },
                            ],
                          },
                        },
                      },
                      0,
                      3,
                    ],
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
                        yards: "$$player.rushing.yards",
                        longest_rush: "$$player.rushing.longest_rush",
                        rushing_touchdowns:
                          "$$player.rushing.rushing_touchdowns",
                        yards_per_game: "$$player.rushing.yards_per_game",
                        rushing_attempts: "$$player.rushing.rushing_attempts",
                      },
                    ],
                  },
                },
              },
              receiving: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeAwayTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.receiving", false] }, // Check if passing object exists
                            ],
                          },
                        },
                      },
                      0,
                      4,
                    ],
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
                        receiving_targets:
                          "$$player.receiving.receiving_targets",
                        longest_reception:
                          "$$player.receiving.longest_reception",
                        receiving_touchdowns:
                          "$$player.receiving.receiving_touchdowns",
                        yards_per_game: "$$player.receiving.yards_per_game",
                        receiving_yards: "$$player.receiving.receiving_yards",
                        receptions: "$$player.receiving.receptions",
                      },
                    ],
                  },
                },
              },
            },
            homeTeam: {
              passing: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeHomeTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.passing", false] },
                            ],
                          },
                        },
                      },
                      0,
                      2,
                    ],
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
                        interceptions: "$$player.passing.interceptions",
                        sacks: "$$player.passing.sacks",
                        quarterback_rating:
                          "$$player.passing.quarterback_rating",
                        passing_touchdowns:
                          "$$player.passing.passing_touchdowns",
                        yards_per_game: "$$player.passing.yards_per_game",
                        yards: "$$player.passing.yards",
                        completions_by_Attempts: {
                          $concat: [
                            "$$player.passing.completions",
                            "/",
                            "$$player.passing.passing_attempts",
                          ],
                        },
                      },
                    ],
                  },
                },
              },
              rushing: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeHomeTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.rushing", false] },
                            ],
                          },
                        },
                      },
                      0,
                      3,
                    ],
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
                        yards: "$$player.rushing.yards",
                        longest_rush: "$$player.rushing.longest_rush",
                        rushing_touchdowns:
                          "$$player.rushing.rushing_touchdowns",
                        yards_per_game: "$$player.rushing.yards_per_game",
                        rushing_attempts: "$$player.rushing.rushing_attempts",
                      },
                    ],
                  },
                },
              },
              receiving: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeHomeTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.receiving", false] }, // Check if passing object exists
                            ],
                          },
                        },
                      },
                      0,
                      4,
                    ],
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
                        receiving_targets:
                          "$$player.receiving.receiving_targets",
                        longest_reception:
                          "$$player.receiving.longest_reception",
                        receiving_touchdowns:
                          "$$player.receiving.receiving_touchdowns",
                        yards_per_game: "$$player.receiving.yards_per_game",
                        receiving_yards: "$$player.receiving.receiving_yards",
                        receptions: "$$player.receiving.receptions",
                      },
                    ],
                  },
                },
              },
            },
          },

          teamStatistics: [
            {
              title: "Points Scored",
              homeTeam: { $arrayElemAt: ["$standings.homeTeam.points_for", 0] },
              awayTeam: { $arrayElemAt: ["$standings.awayTeam.points_for", 0] },
              total: {
                $add: [
                  {
                    $toInt: {
                      $arrayElemAt: ["$standings.homeTeam.points_for", 0],
                    },
                  },
                  {
                    $toInt: {
                      $arrayElemAt: ["$standings.awayTeam.points_for", 0],
                    },
                  },
                ],
              },
            },

            {
              title: "Points Against",
              homeTeam: {
                $arrayElemAt: ["$standings.homeTeam.points_against", 0],
              },
              awayTeam: {
                $arrayElemAt: ["$standings.awayTeam.points_against", 0],
              },
              total: {
                $add: [
                  {
                    $toDouble: {
                      $arrayElemAt: ["$standings.homeTeam.points_against", 0],
                    },
                  },
                  {
                    $toDouble: {
                      $arrayElemAt: ["$standings.awayTeam.points_against", 0],
                    },
                  },
                ],
              },
            },
            {
              title: "Passing Yards",
              homeTeam: {
                $arrayElemAt: [
                  "$statsTeams.homeTeam.passingTeam.yards_per_game",
                  0,
                ],
              },
              awayTeam: {
                $arrayElemAt: [
                  "$statsTeams.awayTeam.passingTeam.yards_per_game",
                  0,
                ],
              },
              total: {
                $add: [
                  {
                    $toDouble: {
                      $arrayElemAt: [
                        "$statsTeams.homeTeam.passingTeam.yards_per_game",
                        0,
                      ],
                    },
                  },
                  {
                    $toDouble: {
                      $arrayElemAt: [
                        "$statsTeams.awayTeam.passingTeam.yards_per_game",
                        0,
                      ],
                    },
                  },
                ],
              },
            },
            {
              title: "Rushing Yards",
              homeTeam: {
                $arrayElemAt: [
                  "$statsTeams.homeTeam.rushingTeam.yards_per_game",
                  0,
                ],
              },
              awayTeam: {
                $arrayElemAt: [
                  "$statsTeams.awayTeam.rushingTeam.yards_per_game",
                  0,
                ],
              },
              total: {
                $add: [
                  {
                    $toDouble: {
                      $arrayElemAt: [
                        "$statsTeams.homeTeam.rushingTeam.yards_per_game",
                        0,
                      ],
                    },
                  },
                  {
                    $toDouble: {
                      $arrayElemAt: [
                        "$statsTeams.awayTeam.rushingTeam.yards_per_game",
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          ],
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
              homeTeamSpread: "$odds.homeTeamSpread.handicap",
              homeTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$odds.homeTeamSpread.us" }, 0] },
                  { $concat: ["+", "$odds.homeTeamSpread.us"] },
                  "$odds.homeTeamSpread.us",
                ],
              },
            },
            awayTeamSpreadObj: {
              awayTeamSpread: "$odds.awayTeamSpread.handicap",
              awayTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$odds.awayTeamSpread.us" }, 0] },
                  { $concat: ["+", "$odds.awayTeamSpread.us"] },
                  "$odds.awayTeamSpread.us",
                ],
              },
            },
            homeTeamTotal: "$odds.homeTeamTotal",
            awayTeamTotal: "$odds.awayTeamTotal",
          },
        },
      },
    ]);
    return getMatch[0];
  } catch (error) {}
};
const getLiveDataOfNfl = async (data: any) => {
  return await NflMatch.aggregate([
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
              $ne: "Final/OT",
            },
          },
          {
            status: {
              $ne: "Final/2OT",
            },
          },
          {
            status: {
              $not: {
                $regex: "^Final",
                $options: "i",
              },
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
        seasonName: {
          $in: data.data.map((name:any) => name.seasonName)
        },
        weekName: {
          $in: data.data.map((name:any) => name.weekName)
        },
      },
    },
    // {
    //   $addFields: {
    //     spliteTime: {
    //       $split: ["$dateTimeUtc", " "],
    //     },
    //   },
    // },
    // {
    //   $addFields: {
    //     dateutc: {
    //       $toDate: "$dateTimeUtc",
    //     },
    //   },
    // },
    // {
    //   $addFields: {
    //     dateInString: {
    //       $toString: "$dateutc",
    //     },
    //   },
    // },
    {
      $match: {
        seasonName: data.seasonName,
        weekName: data.weekName,
      },
    },
    {
      $lookup: {
        from: "nflteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nflteams",
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
        from: "nflstandings",
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
        from: "nflstandings",
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
        from: "nflteamimages",
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
        from: "nflteamimages",
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
        status: "$status",
        drive: true,
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
};

const nflFinal = async (goalServeMatchId: string) => {
  try {
    const getMatch = await NflMatch.aggregate([
      {
        $match: {
          goalServeMatchId: Number(goalServeMatchId),
        },
      },
      {
        $lookup: {
          from: "nflteams",
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
          from: "nflstandings",
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
          from: "nflteamimages",
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
          from: "nflmatchstatsteams",
          localField: "goalServeMatchId",
          foreignField: "goalServeMatchId",
          as: "matchStatsTeams",
        },
      },
      {
        $unwind: "$matchStatsTeams",
      },
      {
        $lookup: {
          from: "nflplayers",
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
            {
              $sort: {
                "passing.rank": 1,
                "rushing.rank": 1,
                "receiving.rank": 1,
              },
            },
          ],
          as: "players",
        },
      },
      {
        $project: {
          id: true,
          attendance: true,
          status: true,
          venueName: true,
          goalServeMatchId: true,
          goalServeLeagueId: true,
          teamStats: {
            awayTeam: {
              total_yards: "$matchStatsTeams.team_stats.awayteam.yards.total",
              passing_yards:
                "$matchStatsTeams.team_stats.awayteam.passing.total",
              rushing_yards:
                "$matchStatsTeams.team_stats.awayteam.rushing.total",
              turnover: "$matchStatsTeams.team_stats.awayteam.turnovers.total",
              panalties: "$matchStatsTeams.team_stats.awayteam.penalties.total",
              first_downs:
                "$matchStatsTeams.team_stats.awayteam.first_downs.total",
              third_down_efficiency:
                "$matchStatsTeams.team_stats.awayteam.first_downs.third_down_efficiency",
              fourth_down_efficiency:
                "$matchStatsTeams.team_stats.awayteam.first_downs.fourth_down_efficiency",
            },
            homeTeam: {
              total_yards:
                "$matchStatsTeams.matchStatsTeams.team_stats.hometeam.yards.total",
              passing_yards:
                "$matchStatsTeams.team_stats.hometeam.passing.total",
              rushing_yards:
                "$matchStatsTeams.team_stats.hometeam.rushing.total",
              turnover: "$matchStatsTeams.team_stats.hometeam.turnovers.total",
              panalties: "$matchStatsTeams.team_stats.hometeam.penalties.total",
              first_downs:
                "$matchStatsTeams.team_stats.hometeam.first_downs.total",
              third_down_efficiency:
                "$matchStatsTeams.team_stats.hometeam.first_downs.third_down_efficiency",
              fourth_down_efficiency:
                "$matchStatsTeams.team_stats.hometeam.first_downs.fourth_down_efficiency",
            },
          },
          datetime_utc: "$dateTimeUtc",
          weekName: "$weekName",
          seasonName: "$seasonName",
          statsTeams: true,
          awayTeamFullName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
          homeTeamFullName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
          awayTeamAbbreviation: {
            $arrayElemAt: ["$teams.awayTeam.abbreviation", 0],
          },
          homeTeamAbbreviation: {
            $arrayElemAt: ["$teams.homeTeam.abbreviation", 0],
          },
          awayTeam: {
            awayTeamName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
            goalServeAwayTeamId: {
              $arrayElemAt: ["$teams.awayTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.awayTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.awayTeam.lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
            awayTeamTotalScore: "$awayTeamTotalScore",
            // awayTeamHit: "$awayTeamHit",
          },
          homeTeam: {
            homeTeamName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            goalServeHomeTeamId: {
              $arrayElemAt: ["$teams.homeTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.homeTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.homeTeam.lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
            homeTeamTotalScore: "$homeTeamTotalScore",
          },
          homeTeamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
          awayTeamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
          playerStatistics: {
            awayTeam: {
              passing: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeAwayTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.passing", false] },
                            ],
                          },
                        },
                      },
                      0,
                      2,
                    ],
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
                        interceptions: "$$player.passing.interceptions",
                        sacks: "$$player.passing.sacks",
                        quarterback_rating:
                          "$$player.passing.quarterback_rating",
                        passing_touchdowns:
                          "$$player.passing.passing_touchdowns",
                        yards_per_game: "$$player.passing.yards_per_game",
                        yards: "$$player.passing.yards",
                        completions_by_Attempts: {
                          $concat: [
                            "$$player.passing.completions",
                            "/",
                            "$$player.passing.passing_attempts",
                          ],
                        },
                      },
                    ],
                  },
                },
              },
              rushing: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeHomeTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.rushing", false] },
                            ],
                          },
                        },
                      },
                      0,
                      3,
                    ],
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
                        yards: "$$player.rushing.yards",
                        longest_rush: "$$player.rushing.longest_rush",
                        rushing_touchdowns:
                          "$$player.rushing.rushing_touchdowns",
                        yards_per_game: "$$player.rushing.yards_per_game",
                        rushing_attempts: "$$player.rushing.rushing_attempts",
                      },
                    ],
                  },
                },
              },
              receiving: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeAwayTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.receiving", false] }, // Check if passing object exists
                            ],
                          },
                        },
                      },
                      0,
                      4,
                    ],
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
                        receiving_targets:
                          "$$player.receiving.receiving_targets",
                        longest_reception:
                          "$$player.receiving.longest_reception",
                        receiving_touchdowns:
                          "$$player.receiving.receiving_touchdowns",
                        yards_per_game: "$$player.receiving.yards_per_game",
                        receiving_yards: "$$player.receiving.receiving_yards",
                        receptions: "$$player.receiving.receptions",
                      },
                    ],
                  },
                },
              },
            },
            homeTeam: {
              passing: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeHomeTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.passing", false] },
                            ],
                          },
                        },
                      },
                      0,
                      2,
                    ],
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
                        interceptions: "$$player.passing.interceptions",
                        sacks: "$$player.passing.sacks",
                        quarterback_rating:
                          "$$player.passing.quarterback_rating",
                        passing_touchdowns:
                          "$$player.passing.passing_touchdowns",
                        yards_per_game: "$$player.passing.yards_per_game",
                        yards: "$$player.passing.yards",
                        completions_by_Attempts: {
                          $concat: [
                            "$$player.passing.completions",
                            "/",
                            "$$player.passing.passing_attempts",
                          ],
                        },
                      },
                    ],
                  },
                },
              },
              rushing: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeHomeTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.rushing", false] },
                            ],
                          },
                        },
                      },
                      0,
                      3,
                    ],
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
                        yards: "$$player.rushing.yards",
                        longest_rush: "$$player.rushing.longest_rush",
                        rushing_touchdowns:
                          "$$player.rushing.rushing_touchdowns",
                        yards_per_game: "$$player.rushing.yards_per_game",
                        rushing_attempts: "$$player.rushing.rushing_attempts",
                      },
                    ],
                  },
                },
              },
              receiving: {
                $map: {
                  input: {
                    $slice: [
                      {
                        $filter: {
                          input: "$players",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeHomeTeamId",
                                ],
                              },
                              { $ifNull: ["$$this.receiving", false] }, // Check if passing object exists
                            ],
                          },
                        },
                      },
                      0,
                      4,
                    ],
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
                        receiving_targets:
                          "$$player.receiving.receiving_targets",
                        longest_reception:
                          "$$player.receiving.longest_reception",
                        receiving_touchdowns:
                          "$$player.receiving.receiving_touchdowns",
                        yards_per_game: "$$player.receiving.yards_per_game",
                        receiving_yards: "$$player.receiving.receiving_yards",
                        receptions: "$$player.receiving.receptions",
                      },
                    ],
                  },
                },
              },
            },
          },
          scoring: {
            awayTeam: [
              {
                title: "Quater 1",
                score: {
                  $cond: {
                    if: { $eq: ["$awayTeamQ1", "0"] },
                    then: "-",
                    else: "$awayTeamQ1",
                  },
                },
              },
              {
                title: "Quater 2",
                score: {
                  $cond: {
                    if: { $eq: ["$awayTeamQ2", "0"] },
                    then: "-",
                    else: "$awayTeamQ2",
                  },
                },
              },
              {
                title: "Quater 3",
                score: {
                  $cond: {
                    if: { $eq: ["$awayTeamQ3", "0"] },
                    then: "-",
                    else: "$awayTeamQ3",
                  },
                },
              },
              {
                title: "Quater 4",
                score: {
                  $cond: {
                    if: { $eq: ["$awayTeamQ4", "0"] },
                    then: "-",
                    else: "$awayTeamQ4",
                  },
                },
              },
              {
                title: "Total",
                score: "$awayTeamTotalScore",
              },
            ],

            homeTeam: [
              {
                title: "Quater 1",
                score: {
                  $cond: {
                    if: { $eq: ["$homeTeamQ1", "0"] },
                    then: "-",
                    else: "$homeTeamQ1",
                  },
                },
              },
              {
                title: "Quater 2",
                score: {
                  $cond: {
                    if: { $eq: ["$homeTeamQ2", "0"] },
                    then: "-",
                    else: "$homeTeamQ2",
                  },
                },
              },
              {
                title: "Quater 3",
                score: {
                  $cond: {
                    if: { $eq: ["$homeTeamQ3", "0"] },
                    then: "-",
                    else: "$homeTeamQ3",
                  },
                },
              },
              {
                title: "Quater 4",
                score: {
                  $cond: {
                    if: { $eq: ["$homeTeamQ4", "0"] },
                    then: "-",
                    else: "$homeTeamQ4",
                  },
                },
              },
              {
                title: "Total",
                score: "$homeTeamTotalScore",
              },
            ],
          },
          scoringSummaries: [
            { child: "$firstQuarterEvent", title: "1st Quarter" },
            { child: "$secondQuarterEvent", title: "2nd Quarter" },
            { child: "$thirdQuarterEvent", title: "3nd Quarter" },
            { child: "$fourthQuarterEvent", title: "4nd Quarter" },
            { child: "$overtimeEvent", title: "Overtime" },
          ],
        },
      },
    ]);
    return getMatch[0];
  } catch (error) {}
};

const nflLive = async (goalServeMatchId: string) => {
  try {
    const getMatch = await NflMatch.aggregate([
      {
        $match: {
          goalServeMatchId: Number(goalServeMatchId),
        },
      },
      {
        $lookup: {
          from: "nflteams",
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
          from: "nflstandings",
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
          from: "nflteamimages",
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
          from: "nflinjuries",
          localField: "goalServeHomeTeamId",
          foreignField: "goalServeTeamId",
          as: "homeTeamInjuredPlayers",
        },
      },
      {
        $lookup: {
          from: "nflinjuries",
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
          drive: 1,
          venueName: true,
          goalServeMatchId: true,
          goalServeLeagueId: true,
          datetime_utc: "$dateTimeUtc",
          weekName: "$weekName",
          seasonName: "$seasonName",
          statsTeams: true,
          awayTeamFullName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
          homeTeamFullName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
          awayTeamAbbreviation: {
            $arrayElemAt: ["$teams.awayTeam.abbreviation", 0],
          },
          homeTeamAbbreviation: {
            $arrayElemAt: ["$teams.homeTeam.abbreviation", 0],
          },
          awayTeam: {
            awayTeamName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
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
            won: { $arrayElemAt: ["$standings.homeTeam.won", 0] },
            lose: { $arrayElemAt: ["$standings.homeTeam.lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
          },
          homeTeamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
          awayTeamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
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
          playerStatistics: {
            awayTeam: {
              passing: {
                $map: {
                  input: "$awayTeamPassing",
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",
                        comp_att: "$$player.comp_att",
                        interceptions: "$$player.interceptions",
                        yards: "$$player.yards",
                        average: "$$player.average",
                        sacks: "$$player.sacks",
                        rating: "$$player.rating",
                        passing_touchdowns: "$$player.passing_touch_downs",
                      },
                    ],
                  },
                },
              },
              rushing: {
                $map: {
                  input: "$awayTeamRushing",
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.goalServePlayerId",

                        total_rushes: "$$player.total_rushes",
                        yards: "$$player.rushing.yards",
                        average: "$$player.rushing.average",
                        longest_rush: "$$player.rushing.longest_rush",
                        rushing_touch_downs: "$$player.rushing_touch_downs",
                      },
                    ],
                  },
                },
              },
              receiving: {
                $map: {
                  input: "$awayTeamReceiving",

                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.goalServePlayerId",
                        goalServeTeamId: "$$player.goalServeTeamId",
                        total_receptions: "$$player.total_receptions",
                        yards: "$$player.yards",
                        average: "$$player.average",
                        receiving_touch_downs: "$$player.receiving_touch_downs",
                        longest_reception: "$$player.longest_reception",
                        targets: "$$player.targets",
                      },
                    ],
                  },
                },
              },
            },
            homeTeam: {
              passing: {
                $map: {
                  input: "$homeTeamPassing",
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",
                        comp_att: "$$player.comp_att",
                        interceptions: "$$player.interceptions",
                        yards: "$$player.yards",
                        average: "$$player.average",
                        sacks: "$$player.sacks",
                        rating: "$$player.rating",
                        passing_touchdowns: "$$player.passing_touch_downs",
                      },
                    ],
                  },
                },
              },
              rushing: {
                $map: {
                  input: "$homeTeamRushing",
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.goalServePlayerId",

                        total_rushes: "$$player.total_rushes",
                        yards: "$$player.rushing.yards",
                        average: "$$player.rushing.average",
                        longest_rush: "$$player.rushing.longest_rush",
                        rushing_touch_downs: "$$player.rushing_touch_downs",
                      },
                    ],
                  },
                },
              },
              receiving: {
                $map: {
                  input: "$homeTeamReceiving",

                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.goalServePlayerId",
                        goalServeTeamId: "$$player.goalServeTeamId",
                        total_receptions: "$$player.total_receptions",
                        yards: "$$player.yards",
                        average: "$$player.average",
                        receiving_touch_downs: "$$player.receiving_touch_downs",
                        longest_reception: "$$player.longest_reception",
                        targets: "$$player.targets",
                      },
                    ],
                  },
                },
              },
            },
          },
          scoring: {
            awayTeam: [
              {
                title: "Quater 1",
                score: {
                  $cond: {
                    if: { $eq: ["$awayTeamQ1", "0"] },
                    then: "-",
                    else: "$awayTeamQ1",
                  },
                },
              },
              {
                title: "Quater 2",
                score: {
                  $cond: {
                    if: { $eq: ["$awayTeamQ2", "0"] },
                    then: "-",
                    else: "$awayTeamQ2",
                  },
                },
              },
              {
                title: "Quater 3",
                score: {
                  $cond: {
                    if: { $eq: ["$awayTeamQ3", "0"] },
                    then: "-",
                    else: "$awayTeamQ3",
                  },
                },
              },
              {
                title: "Quater 4",
                score: {
                  $cond: {
                    if: { $eq: ["$awayTeamQ4", "0"] },
                    then: "-",
                    else: "$awayTeamQ4",
                  },
                },
              },
              {
                title: "Total",
                score: "$awayTeamTotalScore",
              },
            ],

            homeTeam: [
              {
                title: "Quater 1",
                score: {
                  $cond: {
                    if: { $eq: ["$homeTeamQ1", "0"] },
                    then: "-",
                    else: "$homeTeamQ1",
                  },
                },
              },
              {
                title: "Quater 2",
                score: {
                  $cond: {
                    if: { $eq: ["$homeTeamQ2", "0"] },
                    then: "-",
                    else: "$homeTeamQ2",
                  },
                },
              },
              {
                title: "Quater 3",
                score: {
                  $cond: {
                    if: { $eq: ["$homeTeamQ3", "0"] },
                    then: "-",
                    else: "$homeTeamQ3",
                  },
                },
              },
              {
                title: "Quater 4",
                score: {
                  $cond: {
                    if: { $eq: ["$homeTeamQ4", "0"] },
                    then: "-",
                    else: "$homeTeamQ4",
                  },
                },
              },
              {
                title: "Total",
                score: "$homeTeamTotalScore",
              },
            ],
          },
        },
      },
    ]);
    return getMatch[0];
  } catch (error) {}
};

const scoreWithWeek = async () => {
  try {
    let curruntDay = moment().startOf("day").utc().toISOString();
    let subtractOneDay = moment(curruntDay)
      .subtract(24, "hours")
      .utc()
      .toISOString();
    // let addOneDay = moment(curruntDay).add(48, "hours").utc().toISOString();
    // console.log("subtractOneDay", subtractOneDay);
    // console.log("addOneDay", addOneDay);
    // const getWeek = await NflMatch.aggregate([]);
    let addOneDay = moment(curruntDay).add(48, "hours").utc().toISOString();
    const data = await NflMatch.aggregate([
      {
        $addFields: {
          dateutc: {
            $toDate: "$formattedDate",
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
        },
      },
      {
        $group: {
          _id: {
            weekName: "$weekName",
            seasonName: "$seasonName",
          },
          data: {
            $push: "$$ROOT",
          },
        },
      },
      {
        $project: {
          weekName: "$_id.weekName",
          seasonName: "$_id.seasonName",
        },
      },
      // {
      //   $group: {
      //     _id: null,
      //     data: {
      //       $push: "$$ROOT",
      //     },
      //   },
      // },
    ]);

    // console.log(
    //   "getWeek[0].data.map",
    //   getWeek
    // );

    const getMatches = await scoreWithDate({data:data})
    // console.log("getMatches", getMatches);
  } catch (error: any) {
    console.log("error", error);
  }
};
export default {
  addStanding,
  getStandings,
  getCalendar,
  scoreWithDate,
  addFinalMatch,
  nflUpcomming,
  getLiveDataOfNfl,
  nflFinal,
  nflLive,
  scoreWithWeek,
};
