import moment from "moment";
import NcaafMatch from "../../models/documents/NCAAF/match.model";
import TeamNCAAF from "../../models/documents/NCAAF/team.model";
import TeamImageNCAAF from "../../models/documents/NCAAF/teamImage.model";
import League from "../../models/documents/league.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import socketService from "../../services/socket.service";
import NCAAFStandings from "../../models/documents/NCAAF/standing.model";
var csv = require("csvtojson");

const addTeam = async (data: any) => {
  const league: ILeagueModel | undefined | null = await League.findOne({
    goalServeLeagueId: 2,
  });
  csv()
    .fromFile(data.path)
    .then(async (jsonObj: any) => {
      var teamArray: any = [];
      for (var i = 0; i < jsonObj.length; i++) {
        var obj: any = {};
        obj.goalServeTeamId = Number(jsonObj[i]["id"]);
        obj.name = jsonObj[i]["Team"];
        obj.teamName = jsonObj[i]["Team Name"];
        obj.leagueId = league?._id;
        obj.leagueName = league?.name;
        obj.division = jsonObj[i]["Division"];
        obj.locality = jsonObj[i]["Locality"];
        obj.isDeleted = false;
        obj.goalServeLeagueId = league?.goalServeLeagueId;
        obj.conference = jsonObj[i]["Conference"];
        obj.conferenceName = jsonObj[i]["Conference Name"];
        obj.conferenceId = jsonObj[i]["Conf_id"];

        teamArray.push(obj);
      }
      await TeamNCAAF.insertMany(teamArray);
    })
    .catch((error: any) => {
      console.log(error);
    });
};

const getCalendar = async () => {
  const getCalendar = await NcaafMatch.aggregate([
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
        _id: null,
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
        _id: false,
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
      return item;
    })
  );
};

const addTeamImage = async (data: any) => {
  const teamImage = new TeamImageNCAAF(data);
  const saved = await teamImage.save();
};

const scoreWithDate = async (data: any) => {
  const getUpcomingMatch = await NcaafMatch.aggregate([
    {
      $match: {
        weekName: {
          $in: data.calenderData.map((name: any) => name.weekName),
        },
        status: "Not Started",
      },
    },
    {
      $lookup: {
        from: "ncaafteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "ncaafteams",
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
        from: "ncaafstandings",
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
        from: "ncaafstandings",
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
        from: "ncaafteamimages",
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
        from: "ncaafteamimages",
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
        from: "ncaafodds",
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
        goalServeLeagueId: true,
        awayTeamAbbreviation: "$awayTeam.locality",
        homeTeamAbbreviation: "$homeTeam.locality",
        weekName: true,
        seasonName: true,
        awayTeam: {
          abbreviation: "$awayTeam.locality",
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: "$awayTeamStandings.overall_won",
          lose: "$awayTeamStandings.overall_lost",
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
          abbreviation: "$homeTeam.locality",
          homeTeamName: "$homeTeam.name",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.overall_won",
          lose: "$homeTeamStandings.overall_lost",
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
  const getFinalMatch = await NcaafMatch.aggregate([
    {
      $match: {
        weekName: {
          $in: data.calenderData.map((name: any) => name.weekName),
        },
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
        ],
      },
    },
    {
      $lookup: {
        from: "ncaafteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "ncaafteams",
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
        from: "ncaafstandings",
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
        from: "ncaafstandings",
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
        from: "ncaafteamimages",
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
        from: "ncaafteamimages",
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
        goalServeLeagueId: true,
        awayTeamAbbreviation: "$awayTeam.locality",
        homeTeamAbbreviation: "$homeTeam.locality",
        weekName: true,
        seasonName: true,
        awayTeam: {
          abbreviation: "$awayTeam.locality",
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
          awayTeamRun: "$awayTeamTotalScore",
          won: "$awayTeamStandings.overall_won",
          lose: "$awayTeamStandings.overall_lost",
          teamImage: "$awayTeamImage.image",
          ties: {
            $sum: { $ifNull: [{ $toInt: "$awayTeamStandings.ties" }, 0] },
          },
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
          abbreviation: "$homeTeam.locality",
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
          homeTeamRun: "$homeTeamTotalScore",
          won: "$homeTeamStandings.overall_won",
          lose: "$homeTeamStandings.overall_lost",
          ties: {
            $sum: { $ifNull: [{ $toInt: "$homeTeamStandings.ties" }, 0] },
          },
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
    await socketService.socket("ncaafDashboard", {
      getUpcomingMatch,
      getFinalMatch,
      getLiveDataOfNcaaf: await getLiveDataOfNcaaf(data),
    });
    return {
      getUpcomingMatch,
      getFinalMatch,
      getLiveDataOfNcaaf: await getLiveDataOfNcaaf(data),
    };
  }
};

const getLiveDataOfNcaaf = async (data: any) => {
  return await NcaafMatch.aggregate([
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
              $ne: "After Over Time",
            },
          },
          {
            status: {
              $ne: "Suspended",
            },
          },
        ],
        // seasonName: {
        //   $in: data.calenderData.map((name: any) => name.seasonName),
        // },
        weekName: {
          $in: data.calenderData.map((name: any) => name.weekName),
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
    // {
    //   $match: {
    //     seasonName: data.seasonName,
    //     weekName: data.weekName,
    //   },
    // },
    {
      $lookup: {
        from: "ncaafteams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "ncaafteams",
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
        from: "ncaafstandings",
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
        from: "ncaafstandings",
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
        from: "ncaafteamimages",
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
        from: "ncaafteamimages",
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
      $addFields: {
        status: {
          $switch: {
            branches: [
              {
                case: {
                  $gt: [
                    {
                      $indexOfArray: [{ $split: ["$status", " "] }, "Quarter"],
                    },
                    -1,
                  ],
                },
                then: {
                  $concat: [
                    { $arrayElemAt: [{ $split: ["$status", " "] }, 0] },
                    " Qtr",
                  ],
                },
              },
              {
                case: { $eq: ["$status", "End of Period"] },
                then: "End of Quarter",
              },
            ],
            default: "$status",
          },
        },
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
        goalServeLeagueId: true,
        goalServeMatchId: true,
        timer: "$timer",
        weekName: true,
        seasonName: true,
        awayTeam: {
          abbreviation: "$awayTeam.locality",
          awayTeamName: "$awayTeam.name",
          awayTeamId: "$awayTeam._id",
          awayTeamRun: "$awayTeamTotalScore",
          won: "$awayTeamStandings.overall_won",
          lose: "$awayTeamStandings.overall_lost",
          teamImage: "$awayTeamImage.image",
          goalServeAwayTeamId: "$goalServeAwayTeamId",
          isWinner: {
            $cond: {
              if: {
                $regexMatch: {
                  input: "$drive",
                  regex: "$awayTeam.locality",
                },
              },
              then: true,
              else: false,
            },
          },
        },
        homeTeam: {
          abbreviation: "$homeTeam.locality",
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          homeTeamRun: "$homeTeamTotalScore",
          won: "$homeTeamStandings.overall_won",
          lose: "$homeTeamStandings.overall_lost",
          teamImage: "$homeTeamImage.image",
          goalServeHomeTeamId: "$goalServeHomeTeamId",
          isWinner: {
            $cond: {
              if: {
                $regexMatch: {
                  input: "$drive",
                  regex: "$homeTeam.locality",
                },
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

const scoreWithWeek = async () => {
  try {
    let curruntDay1 = moment().startOf("day").utc().toISOString();
    let subtractOneDay = moment(curruntDay1)
      .subtract(2, "weeks")
      .utc()
      .toISOString();
    let addOneDay = moment(curruntDay1).add(2, "weeks").utc().toISOString();
    const data = await NcaafMatch.aggregate([
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
            // seasonName: "$seasonName",
          },
          data: {
            $push: "$$ROOT",
          },
        },
      },
      {
        $project: {
          weekName: "$_id.weekName",
          // seasonName: "$_id.seasonName",
        },
      },
    ]);
    const getMatches = await scoreWithDate({ calenderData: data });
  } catch (error: any) {
    console.log("error", error);
  }
};

const ncaafUpcomming = async (goalServeMatchId: string) => {
  try {
    const getMatch = await NcaafMatch.aggregate([
      {
        $match: {
          goalServeMatchId: Number(goalServeMatchId),
        },
      },
      {
        $lookup: {
          from: "ncaafteams",
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
                      locality: 1,
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
                      locality: 1,
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
          from: "ncaafstandings",
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
                      overall_points_for: 1,
                      overall_points_against: 1,
                      overall_lost: 1,
                      overall_won: 1,
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
                      overall_points_for: 1,
                      overall_points_against: 1,
                      overall_lost: 1,
                      overall_won: 1,
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
          from: "ncaafteamimages",
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
          from: "ncaafplayers",
          let: {
            awayTeamId: "$goalServeAwayTeamId",
            homeTeamId: "$goalServeHomeTeamId",
          },
          pipeline: [
            {
              $match: {
                $and: [
                  {
                    $expr: {
                      $in: [
                        "$goalServeTeamId",
                        ["$$awayTeamId", "$$homeTeamId"],
                      ],
                    },
                  },

                  {
                    isPassingPlayer: true,
                  },
                ],
              },
            },

            {
              $addFields: {
                rankSorting: { $toInt: "$passing.rank" },
              },
            },
            {
              $sort: {
                rankSorting: 1,
              },
            },
          ],
          as: "passingPlayers",
        },
      },
      {
        $lookup: {
          from: "ncaafplayers",
          let: {
            awayTeamId: "$goalServeAwayTeamId",
            homeTeamId: "$goalServeHomeTeamId",
          },
          pipeline: [
            {
              $match: {
                $and: [
                  {
                    $expr: {
                      $in: [
                        "$goalServeTeamId",
                        ["$$awayTeamId", "$$homeTeamId"],
                      ],
                    },
                  },

                  {
                    isRushingPlayer: true,
                  },
                ],
              },
            },

            {
              $addFields: {
                rankSorting: { $toInt: "$rushing.rank" },
              },
            },
            {
              $sort: {
                rankSorting: 1,
              },
            },
          ],
          as: "rushingPlayers",
        },
      },
      {
        $lookup: {
          from: "ncaafplayers",
          let: {
            awayTeamId: "$goalServeAwayTeamId",
            homeTeamId: "$goalServeHomeTeamId",
          },
          pipeline: [
            {
              $match: {
                $and: [
                  {
                    $expr: {
                      $in: [
                        "$goalServeTeamId",
                        ["$$awayTeamId", "$$homeTeamId"],
                      ],
                    },
                  },

                  {
                    isReceivingPlayer: true,
                  },
                ],
              },
            },

            {
              $addFields: {
                rankSorting: { $toInt: "$receiving.rank" },
              },
            },
            {
              $sort: {
                rankSorting: 1,
              },
            },
          ],
          as: "receivingPlayers",
        },
      },
      {
        $lookup: {
          from: "ncaafstatsteams",
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
          from: "ncaafodds",
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
            $arrayElemAt: ["$teams.awayTeam.locality", 0],
          },
          homeTeamAbbreviation: {
            $arrayElemAt: ["$teams.homeTeam.locality", 0],
          },
          awayTeam: {
            abbreviation: {
              $arrayElemAt: ["$teams.awayTeam.locality", 0],
            },
            awayTeamName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
            goalServeAwayTeamId: {
              $arrayElemAt: ["$teams.awayTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.awayTeam.overall_won", 0] },
            lose: { $arrayElemAt: ["$standings.awayTeam.overall_lost", 0] },
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
            abbreviation: {
              $arrayElemAt: ["$teams.homeTeam.locality", 0],
            },
            homeTeamName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            goalServeHomeTeamId: {
              $arrayElemAt: ["$teams.homeTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.homeTeam.overall_won", 0] },
            lose: { $arrayElemAt: ["$standings.homeTeam.overall_lost", 0] },
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
                          input: "$passingPlayers",
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
                        yards_per_pass_avg:
                          "$$player.passing.yards_per_pass_avg",
                        interceptions: "$$player.passing.interceptions",
                        sacks: "$$player.passing.sacks",
                        quaterback_rating: "$$player.passing.quaterback_rating",
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
                        rank: "$$player.passing.rank",
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
                          input: "$rushingPlayers",
                          cond: {
                            $and: [
                              {
                                $eq: [
                                  "$$this.goalServeTeamId",
                                  "$goalServeAwayTeamId",
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
                        yards_per_rush_avg:
                          "$$player.rushing.yards_per_rush_avg",
                        rushing_touchdowns:
                          "$$player.rushing.rushing_touchdowns",
                        yards_per_game: "$$player.rushing.yards_per_game",
                        rushing_attempts: "$$player.rushing.rushing_attempts",
                        rank: "$$player.rushing.rank",
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
                          input: "$receivingPlayers",
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
                        yards_per_reception_avg:
                          "$$player.receiving.yards_per_reception_avg",
                        yards_per_game: "$$player.receiving.yards_per_game",
                        receiving_yards: "$$player.receiving.receiving_yards",
                        receptions: "$$player.receiving.receptions",
                        rank: "$$player.receiving.rank",
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
                          input: "$passingPlayers",
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
                        yards_per_pass_avg:
                          "$$player.passing.yards_per_pass_avg",
                        sacks: "$$player.passing.sacks",
                        quaterback_rating: "$$player.passing.quaterback_rating",
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
                        rank: "$$player.passing.rank",
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
                          input: "$rushingPlayers",
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
                        yards_per_rush_avg:
                          "$$player.rushing.yards_per_rush_avg",
                        rushing_touchdowns:
                          "$$player.rushing.rushing_touchdowns",
                        yards_per_game: "$$player.rushing.yards_per_game",
                        rushing_attempts: "$$player.rushing.rushing_attempts",
                        rank: "$$player.rushing.rank",
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
                          input: "$receivingPlayers",
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
                        rank: "$$player.receiving.rank",
                        yards_per_reception_avg:
                          "$$player.receiving.yards_per_reception_avg",
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
              homeTeam: { $arrayElemAt: ["$standings.homeTeam.overall_points_for", 0] },
              awayTeam: { $arrayElemAt: ["$standings.awayTeam.overall_points_for", 0] },
              total: {
                $add: [
                  {
                    $toInt: {
                      $arrayElemAt: ["$standings.homeTeam.overall_points_for", 0],
                    },
                  },
                  {
                    $toInt: {
                      $arrayElemAt: ["$standings.awayTeam.overall_points_for", 0],
                    },
                  },
                ],
              },
            },

            {
              title: "Points Against",
              homeTeam: {
                $arrayElemAt: ["$standings.homeTeam.overall_points_against", 0],
              },
              awayTeam: {
                $arrayElemAt: ["$standings.awayTeam.overall_points_against", 0],
              },
              total: {
                $add: [
                  {
                    $toDouble: {
                      $arrayElemAt: ["$standings.homeTeam.overall_points_against", 0],
                    },
                  },
                  {
                    $toDouble: {
                      $arrayElemAt: ["$standings.awayTeam.overall_points_against", 0],
                    },
                  },
                ],
              },
            },
            {
              title: "Passing Yards",
              homeTeam: {
                $arrayElemAt: [
                  "$statsTeams.homeTeam.passingTeam.yards_per_pass_avg",
                  0,
                ],
              },
              awayTeam: {
                $arrayElemAt: [
                  "$statsTeams.awayTeam.passingTeam.yards_per_pass_avg",
                  0,
                ],
              },
              total: {
                $add: [
                  {
                    $toDouble: {
                      $arrayElemAt: [
                        "$statsTeams.homeTeam.passingTeam.yards_per_pass_avg",
                        0,
                      ],
                    },
                  },
                  {
                    $toDouble: {
                      $arrayElemAt: [
                        "$statsTeams.awayTeam.passingTeam.yards_per_pass_avg",
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
                  "$statsTeams.homeTeam.rushingTeam.yards_per_rush_avg",
                  0,
                ],
              },
              awayTeam: {
                $arrayElemAt: [
                  "$statsTeams.awayTeam.rushingTeam.yards_per_rush_avg",
                  0,
                ],
              },
              total: {
                $add: [
                  {
                    $toDouble: {
                      $arrayElemAt: [
                        "$statsTeams.homeTeam.rushingTeam.yards_per_rush_avg",
                        0,
                      ],
                    },
                  },
                  {
                    $toDouble: {
                      $arrayElemAt: [
                        "$statsTeams.awayTeam.rushingTeam.yards_per_rush_avg",
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
const ncaafFinal = async (goalServeMatchId: string) => {
  try {
    const getMatch = await NcaafMatch.aggregate([
      {
        $match: {
          goalServeMatchId: Number(goalServeMatchId),
        },
      },
      {
        $lookup: {
          from: "ncaafteams",
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
                      locality: 1,
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
                      locality: 1,
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
          from: "ncaafstandings",
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
                      overall_won: 1,
                      overall_lost: 1,
                      ties: { $sum: { $ifNull: [{ $toInt: "$ties" }, 0] } },
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
                      overall_won: 1,
                      overall_lost: 1,
                      ties: { $sum: { $ifNull: [{ $toInt: "$ties" }, 0] } },
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
          from: "ncaafteamimages",
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
          from: "ncaafmatchstatsteams",
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
          from: "ncaafodds",
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
          from: "ncaafodds",
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
                "$matchStatsTeams.team_stats.awayteam.rushings.total",
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
              total_yards: "$matchStatsTeams.team_stats.hometeam.yards.total",
              passing_yards:
                "$matchStatsTeams.team_stats.hometeam.passing.total",
              rushing_yards:
                "$matchStatsTeams.team_stats.hometeam.rushings.total",
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
            $arrayElemAt: ["$teams.awayTeam.locality", 0],
          },
          homeTeamAbbreviation: {
            $arrayElemAt: ["$teams.homeTeam.locality", 0],
          },
          awayTeam: {
            abbreviation: {
              $arrayElemAt: ["$teams.awayTeam.locality", 0],
            },
            awayTeamName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
            goalServeAwayTeamId: {
              $arrayElemAt: ["$teams.awayTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.awayTeam.overall_won", 0] },
            ties: { $arrayElemAt: ["$standings.awayTeam.ties", 0] },
            lose: { $arrayElemAt: ["$standings.awayTeam.overall_lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
            awayTeamTotalScore: "$awayTeamTotalScore",
            // awayTeamHit: "$awayTeamHit",
          },
          homeTeam: {
            abbreviation: {
              $arrayElemAt: ["$teams.homeTeam.locality", 0],
            },
            homeTeamName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            goalServeHomeTeamId: {
              $arrayElemAt: ["$teams.homeTeam.goalServeTeamId", 0],
            },
            ties: { $arrayElemAt: ["$standings.homeTeam.ties", 0] },
            won: { $arrayElemAt: ["$standings.homeTeam.overall_won", 0] },
            lose: { $arrayElemAt: ["$standings.homeTeam.overall_lost", 0] },
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
                    $slice: ["$awayTeamPassing", 2],
                  },
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",
                        completions_by_Attempts: "$$player.comp_att",
                        interceptions: "$$player.interceptions",
                        yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        sacks: "$$player.sacks",
                        quarterback_rating: "$$player.rating",
                        passing_touchdowns: "$$player.passing_touch_downs",
                      },
                    ],
                  },
                },
              },
              rushing: {
                $map: {
                  input: { $slice: ["$awayTeamRushing", 3] },
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",

                        rushing_attempts: "$$player.total_rushes",
                        yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        longest_rush: "$$player.longest_rush",
                        rushing_touchdowns: "$$player.rushing_touch_downs",
                      },
                    ],
                  },
                },
              },
              receiving: {
                $map: {
                  input: { $slice: ["$awayTeamReceiving", 4] },

                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",
                        goalServeTeamId: "$$player.goalServeTeamId",
                        receptions: "$$player.total_receptions",
                        receiving_yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        receiving_touchdowns: "$$player.receiving_touch_downs",
                        longest_reception: "$$player.longest_reception",
                        receiving_targets: "$$player.targets",
                      },
                    ],
                  },
                },
              },
            },
            homeTeam: {
              passing: {
                $map: {
                  input: { $slice: ["$homeTeamPassing", 2] },

                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",
                        completions_by_Attempts: "$$player.comp_att",
                        interceptions: "$$player.interceptions",
                        yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        sacks: "$$player.sacks",
                        quarterback_rating: "$$player.rating",
                        passing_touchdowns: "$$player.passing_touch_downs",
                      },
                    ],
                  },
                },
              },
              rushing: {
                $map: {
                  input: { $slice: ["$homeTeamRushing", 3] },
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",

                        rushing_attempts: "$$player.total_rushes",
                        yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        longest_rush: "$$player.longest_rush",
                        rushing_touchdowns: "$$player.rushing_touch_downs",
                      },
                    ],
                  },
                },
              },
              receiving: {
                $map: {
                  input: { $slice: ["$homeTeamReceiving", 4] },
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",
                        goalServeTeamId: "$$player.goalServeTeamId",
                        receptions: "$$player.total_receptions",
                        receiving_yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        receiving_touchdowns: "$$player.receiving_touch_downs",
                        longest_reception: "$$player.longest_reception",
                        receiving_targets: "$$player.targets",
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
              homeTeamSpread: "$outcome.homeTeamSpread.handicap",
              homeTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$outcome.homeTeamSpreadUs" }, 0] },
                  { $concat: ["+", "$outcome.homeTeamSpreadUs"] },
                  "$outcome.homeTeamSpreadUs",
                ],
              },
            },
            awayTeamSpreadObj: {
              awayTeamSpread: "$outcome.awayTeamSpread.handicap",
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
    return getMatch[0];
  } catch (error) {}
};

const ncaafLive = async (goalServeMatchId: any) => {
  try {
    const getMatch = await NcaafMatch.aggregate([
      {
        $match: {
          goalServeMatchId: { $in: goalServeMatchId },
        },
      },
      {
        $lookup: {
          from: "ncaafteams",
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
                      locality: 1,
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
                      locality: 1,
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
          from: "ncaafstandings",
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
                      overall_won: 1,
                      overall_lost: 1,
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
                      overall_won: 1,
                      overall_lost: 1,
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
          from: "ncaafteamimages",
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
          from: "ncaafmatchstatsteams",
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
          from: "ncaafodds",
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
          from: "ncaafodds",
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
        $addFields: {
          status: {
            $switch: {
              branches: [
                {
                  case: {
                    $gt: [
                      {
                        $indexOfArray: [
                          { $split: ["$status", " "] },
                          "Quarter",
                        ],
                      },
                      -1,
                    ],
                  },
                  then: {
                    $concat: [
                      { $arrayElemAt: [{ $split: ["$status", " "] }, 0] },
                      " Qtr",
                    ],
                  },
                },
                {
                  case: { $eq: ["$status", "End of Period"] },
                  then: "End of Quarter",
                },
              ],
              default: "$status",
            },
          },
        },
      },
      {
        $project: {
          id: true,
          attendance: true,
          drive: 1,
          venueName: true,
          goalServeMatchId: true,
          goalServeLeagueId: true,
          datetime_utc: "$dateTimeUtc",
          weekName: "$weekName",
          seasonName: "$seasonName",
          status: "$status",
          timer: true,
          awayTeamFullName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
          homeTeamFullName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
          awayTeamAbbreviation: {
            $arrayElemAt: ["$teams.awayTeam.locality", 0],
          },
          homeTeamAbbreviation: {
            $arrayElemAt: ["$teams.homeTeam.locality", 0],
          },
          awayTeam: {
            abbreviation: {
              $arrayElemAt: ["$teams.awayTeam.locality", 0],
            },
            awayTeamTotalScore: "$awayTeamTotalScore",
            awayTeamName: { $arrayElemAt: ["$teams.awayTeam.name", 0] },
            goalServeAwayTeamId: {
              $arrayElemAt: ["$teams.awayTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.awayTeam.overall_won", 0] },
            lose: { $arrayElemAt: ["$standings.awayTeam.overall_lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
          },
          homeTeam: {
            abbreviation: {
              $arrayElemAt: ["$teams.homeTeam.locality", 0],
            },
            homeTeamTotalScore: "$homeTeamTotalScore",
            homeTeamName: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            goalServeHomeTeamId: {
              $arrayElemAt: ["$teams.homeTeam.goalServeTeamId", 0],
            },
            won: { $arrayElemAt: ["$standings.homeTeam.overall_won", 0] },
            lose: { $arrayElemAt: ["$standings.homeTeam.overall_lost", 0] },
            teamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
          },
          homeTeamImage: { $arrayElemAt: ["$teamImages.homeTeam.image", 0] },
          awayTeamImage: { $arrayElemAt: ["$teamImages.awayTeam.image", 0] },
          playerStatistics: {
            awayTeam: {
              passing: {
                $map: {
                  input: {
                    $slice: ["$awayTeamPassing", 2],
                  },
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",
                        completions_by_Attempts: "$$player.comp_att",
                        interceptions: "$$player.interceptions",
                        yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        sacks: "$$player.sacks",
                        quarterback_rating: "$$player.rating",
                        passing_touchdowns: "$$player.passing_touch_downs",
                      },
                    ],
                  },
                },
              },
              rushing: {
                $map: {
                  input: { $slice: ["$awayTeamRushing", 3] },
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",

                        rushing_attempts: "$$player.total_rushes",
                        yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        longest_rush: "$$player.longest_rush",
                        rushing_touchdowns: "$$player.rushing_touch_downs",
                      },
                    ],
                  },
                },
              },
              receiving: {
                $map: {
                  input: { $slice: ["$awayTeamReceiving", 4] },

                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",
                        goalServeTeamId: "$$player.goalServeTeamId",
                        receptions: "$$player.total_receptions",
                        receiving_yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        receiving_touchdowns: "$$player.receiving_touch_downs",
                        longest_reception: "$$player.longest_reception",
                        receiving_targets: "$$player.targets",
                      },
                    ],
                  },
                },
              },
            },
            homeTeam: {
              passing: {
                $map: {
                  input: { $slice: ["$homeTeamPassing", 2] },

                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",
                        completions_by_Attempts: "$$player.comp_att",
                        interceptions: "$$player.interceptions",
                        yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        sacks: "$$player.sacks",
                        quarterback_rating: "$$player.rating",
                        passing_touchdowns: "$$player.passing_touch_downs",
                      },
                    ],
                  },
                },
              },
              rushing: {
                $map: {
                  input: { $slice: ["$homeTeamRushing", 3] },
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",

                        rushing_attempts: "$$player.total_rushes",
                        yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        longest_rush: "$$player.longest_rush",
                        rushing_touchdowns: "$$player.rushing_touch_downs",
                      },
                    ],
                  },
                },
              },
              receiving: {
                $map: {
                  input: { $slice: ["$homeTeamReceiving", 4] },
                  as: "player",
                  in: {
                    $cond: [
                      { $eq: ["$$player", []] },
                      [],
                      {
                        playerName: "$$player.name",
                        goalServePlayerId: "$$player.id",
                        goalServeTeamId: "$$player.goalServeTeamId",
                        receptions: "$$player.total_receptions",
                        receiving_yards: "$$player.yards",
                        yards_per_game: "$$player.average",
                        receiving_touchdowns: "$$player.receiving_touch_downs",
                        longest_reception: "$$player.longest_reception",
                        receiving_targets: "$$player.targets",
                      },
                    ],
                  },
                },
              },
            },
          },
          teamStats: {
            awayTeam: {
              total_yards: "$matchStatsTeams.team_stats.awayteam.yards.total",
              passing_yards:
                "$matchStatsTeams.team_stats.awayteam.passing.total",
              rushing_yards:
                "$matchStatsTeams.team_stats.awayteam.rushings.total",
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
              total_yards: "$matchStatsTeams.team_stats.hometeam.yards.total",
              passing_yards:
                "$matchStatsTeams.team_stats.hometeam.passing.total",
              rushing_yards:
                "$matchStatsTeams.team_stats.hometeam.rushings.total",
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
              homeTeamSpread: "$liveOdds.homeTeamSpread.handicap",
              homeTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$liveOdds.homeTeamSpread.us" }, 0] },
                  { $concat: ["+", "$liveOdds.homeTeamSpread.us"] },
                  "$liveOdds.homeTeamSpreadUs",
                ],
              },
            },
            awayTeamSpreadObj: {
              awayTeamSpread: "$liveOdds.awayTeamSpread.handicap",
              awayTeamSpreadUs: {
                $cond: [
                  { $gte: [{ $toDouble: "$liveOdds.awayTeamSpread.us" }, 0] },
                  { $concat: ["+", "$liveOdds.awayTeamSpread.us"] },
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
    await socketService.socket("ncaafLiveBoxscore", {
      getMatch,
    });
    return getMatch[0];
  } catch (error) {}
};
const getStandings = async () => {
  const getStandingData = await NCAAFStandings.aggregate([
    {
      $lookup: {
        from: "ncaafteamimages",
        localField: "goalServeTeamId",
        foreignField: "goalServeTeamId",
        as: "images",
      },
    },
    {
      $lookup: {
        from: "ncaafteams",
        localField: "goalServeTeamId",
        foreignField: "goalServeTeamId",
        as: "team",
      },
    },
    {
      $unwind: {
        path: "$team",
        preserveNullAndEmptyArrays: true,
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
        _id: {
          leagueType: "$leagueType",
          division: "$division",
        },
        teams: {
          $push: {
            id: {
              $toString: "$goalServeTeamId",
            },
            abbreviation: "$team.locality",
            images: "$images.image",
            conference_lost: "$conference_lost",
            conference_points_against: "$conference_points_against",
            conference_points_for: "$conference_points_for",
            conference_won: "$conference_won",
            division: "$division",
            goalServeLeagueId: "$goalServeLeagueId",
            leagueType: "$leagueType",
            name: "$name",
            overall_lost: "$overall_lost",
            overall_points_against: "$overall_points_against",
            overall_points_for: "$overall_points_for",
            overall_won: "$overall_won",
            position: "$position",
            streak: "$streak",
          },
        },
        ranking: {
          $push: {
            ap_ranking: "$ap_ranking",
            coaches_ranking: "$coaches_ranking",
            images: "$images.image",
            name: "$name",
            abbreviation: "$team.locality",
          },
        },
      },
    },

    {
      $project: {
        _id: 0,
        conference: {
          name: {
            $cond: {
              if: {
                $regexMatch: {
                  input: {
                    $toLower: "$_id.division",
                  },
                  regex: "main",
                  options: "i", // Case-insensitive
                },
              },

              then: "$_id.leagueType",
              else: {
                $concat: ["$_id.leagueType", " ", "$_id.division"],
              },
            },
          },
          teams: {
            $map: {
              input: "$teams",
              as: "team",
              in: {
                name: "$$team.name",
                teamImage: "$$team.images",
                abbreviation: "$$team.abbreviation",
                conference: {
                  lost: "$$team.conference_lost",
                  points_against: "$$team.conference_points_against",
                  points_for: "$$team.conference_points_for",
                  won: "$$team.conference_won",
                },
                overall: {
                  lost: "$$team.overall_lost",
                  points_against: "$$team.overall_points_against",
                  points_for: "$$team.overall_points_for",
                  won: "$$team.overall_won",
                  streak: "$$team.streak",
                },
              },
            },
          },
        },
        ranking: 1,
      },
    },
    {
      $sort: {
        "conference.name": 1,
      },
    },
    {
      $group: {
        _id: null,
        conference: {
          $push: "$conference",
        },
        ranking: {
          $push: "$ranking",
        },
      },
    },
  ]);
  let rankingData = getStandingData[0].ranking.reduce(
    (result: any, currentArray: any, index: any) => {
      const object = currentArray;

      return result.concat(object);
    },
    []
  );
  let ranking: any = {};
  ranking.apName = "AP Top 25";
  ranking.coachesName = "Coaches Top 25";
  ranking.coachesTeams = rankingData
    .filter((item: any) => item && item.coaches_ranking)
    .map((item: any) => ({
      name: item.coaches_ranking.name,
      points: item.coaches_ranking.points,
      position: item.coaches_ranking.position,
      prev_rank: item.coaches_ranking.prev_rank,
      record: item.coaches_ranking.record,
      images: item.images,
      abbreviation: item.abbreviation,
    }));
  ranking.apTeams = rankingData
    .filter((item: any) => item && item.ap_ranking)
    .map((item: any) => {
      return {
        name: item.ap_ranking.name,
        points: item.ap_ranking.points,
        position: item.ap_ranking.position,
        prev_rank: item.ap_ranking.prev_rank,
        record: item.ap_ranking.record,
        images: item.images,
        abbreviation: item.abbreviation,
      };
    });
  ranking.coachesTeams.sort((a: any, b: any) => {
    const positionA = parseInt(a.position) || 0;
    const positionB = parseInt(b.position) || 0;
    return positionA - positionB;
  });
  ranking.apTeams.sort((a: any, b: any) => {
    const positionA = parseInt(a.position) || 0;
    const positionB = parseInt(b.position) || 0;
    return positionA - positionB;
  });

  return { conference: getStandingData[0].conference, ranking: ranking };
};

export default {
  addTeam,
  getCalendar,
  addTeamImage,
  scoreWithDate,
  getLiveDataOfNcaaf,
  scoreWithWeek,
  ncaafUpcomming,
  ncaafFinal,
  ncaafLive,
  getStandings,
};
