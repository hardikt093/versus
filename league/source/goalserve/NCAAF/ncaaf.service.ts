import moment from "moment";
import NcaafMatch from "../../models/documents/NCAAF/match.model";
import TeamNCAAF from "../../models/documents/NCAAF/team.model";
import TeamImageNCAAF from "../../models/documents/NCAAF/teamImage.model";
import League from "../../models/documents/league.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import socketService from "../../services/socket.service";
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
      return item
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
    // {
    //   $lookup: {
    //     from: "ncaffodds",
    //     let: { matchId: "$goalServeMatchId" },
    //     pipeline: [
    //       {
    //         $match: {
    //           $expr: {
    //             $and: [
    //               { $eq: ["$$matchId", "$goalServeMatchId"] },
    //               { $eq: ["$status", "Not Started"] },
    //             ],
    //           },
    //         },
    //       },
    //       { $sort: { updatedAt: -1 } },
    //       { $limit: 1 },
    //     ],
    //     as: "odds",
    //   },
    // },
    // {
    //   $addFields: {
    //     odds: {
    //       $arrayElemAt: ["$odds", 0],
    //     },
    //   },
    // },

    // {
    //   $addFields: {
    //     awayMoneyline: {
    //       $cond: [
    //         {
    //           $gte: [
    //             {
    //               $toDouble: "$odds.awayTeamMoneyline.us",
    //             },
    //             0,
    //           ],
    //         },
    //         {
    //           $concat: ["+", "$odds.awayTeamMoneyline.us"],
    //         },
    //         "$odds.awayTeamMoneyline.us",
    //       ],
    //     },
    //     homeMoneyline: {
    //       $cond: [
    //         {
    //           $gte: [
    //             {
    //               $toDouble: "$odds.homeTeamMoneyline.us",
    //             },
    //             0,
    //           ],
    //         },
    //         {
    //           $concat: ["+", "$odds.homeTeamMoneyline.us"],
    //         },
    //         "$odds.homeTeamMoneyline.us",
    //       ],
    //     },
    //   },
    // },
    // {
    //   $addFields: {
    //     isAwayTeamNagative: {
    //       $cond: {
    //         if: {
    //           $lt: [
    //             {
    //               $toDouble: "$awayMoneyline",
    //             },
    //             0,
    //           ],
    //         },
    //         then: "yes",
    //         else: "no",
    //       },
    //     },
    //     isHomeTeamNagative: {
    //       $cond: {
    //         if: {
    //           $lt: [
    //             {
    //               $toDouble: "$homeMoneyline",
    //             },
    //             0,
    //           ],
    //         },
    //         then: "yes",
    //         else: "no",
    //       },
    //     },
    //   },
    // },
    // {
    //   $addFields: {
    //     isAwayNagativeOrHomeOrBoth: {
    //       $switch: {
    //         branches: [
    //           {
    //             case: {
    //               $eq: ["$isHomeTeamNagative", "$isAwayTeamNagative"],
    //             },
    //             then: "bothNagative",
    //           },
    //           {
    //             case: {
    //               $eq: ["$isAwayTeamNagative", "yes"],
    //             },
    //             then: "awayIsNagative",
    //           },
    //           {
    //             case: {
    //               $eq: ["$isHomeTeamNagative", "yes"],
    //             },
    //             then: "homeIsNagative",
    //           },
    //         ],
    //         default: 10,
    //       },
    //     },
    //   },
    // },
    // {
    //   $addFields: {
    //     favorite: {
    //       $cond: {
    //         if: {
    //           $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"],
    //         },
    //         then: {
    //           $switch: {
    //             branches: [
    //               {
    //                 case: {
    //                   $lt: [
    //                     {
    //                       $toDouble: "$awayMoneyline",
    //                     },
    //                     {
    //                       $toDouble: "$homeMoneyline",
    //                     },
    //                   ],
    //                 },
    //                 then: {
    //                   favorite: "away",
    //                   moneyline: {
    //                     $abs: {
    //                       $toDouble: "$awayMoneyline",
    //                     },
    //                   },
    //                 },
    //               },
    //               {
    //                 case: {
    //                   $lt: [
    //                     {
    //                       $toDouble: "$homeMoneyline",
    //                     },
    //                     {
    //                       $toDouble: "$awayMoneyline",
    //                     },
    //                   ],
    //                 },
    //                 then: {
    //                   favorite: "home",
    //                   moneyline: {
    //                     $abs: {
    //                       $toDouble: "$homeMoneyline",
    //                     },
    //                   },
    //                 },
    //               },
    //               {
    //                 case: {
    //                   $eq: [
    //                     {
    //                       $toDouble: "$homeMoneyline",
    //                     },
    //                     {
    //                       $toDouble: "$awayMoneyline",
    //                     },
    //                   ],
    //                 },
    //                 then: {
    //                   favorite: "home",
    //                   moneyline: {
    //                     $abs: {
    //                       $toDouble: "$homeMoneyline",
    //                     },
    //                   },
    //                 },
    //               },
    //             ],
    //             default: 10,
    //           },
    //         },
    //         else: {
    //           $cond: {
    //             if: {
    //               $eq: ["$isAwayTeamNagative", "yes"],
    //             },
    //             then: {
    //               favorite: "away",
    //               moneyline: {
    //                 $abs: {
    //                   $toDouble: "$awayMoneyline",
    //                 },
    //               },
    //             },
    //             else: {
    //               favorite: "home",
    //               moneyline: {
    //                 $abs: {
    //                   $toDouble: "$homeMoneyline",
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       },
    //     },
    //   },
    // },
    // {
    //   $addFields: {
    //     underdog: {
    //       $cond: {
    //         if: {
    //           $eq: ["$favorite.favorite", "away"],
    //         },
    //         then: {
    //           underdog: "home",
    //           moneyline: {
    //             $abs: { $toDouble: "$homeMoneyline" },
    //           },
    //         },
    //         else: {
    //           underdog: "away",
    //           moneyline: {
    //             $abs: { $toDouble: "$awayMoneyline" },
    //           },
    //         },
    //       },
    //     },
    //   },
    // },
    // {
    //   $addFields: {
    //     favIP: {
    //       $multiply: [
    //         {
    //           $divide: [
    //             "$favorite.moneyline",
    //             {
    //               $add: ["$favorite.moneyline", 100],
    //             },
    //           ],
    //         },
    //         100,
    //       ],
    //     },
    //     underIp: {
    //       $cond: {
    //         if: {
    //           $or: [
    //             { $eq: ["$favorite.moneyline", "$underdog.moneyline"] },
    //             { $eq: ["$isAwayNagativeOrHomeOrBoth", "bothNagative"] },
    //           ],
    //         },
    //         then: {
    //           $multiply: [
    //             {
    //               $divide: [
    //                 "$underdog.moneyline",
    //                 {
    //                   $add: ["$underdog.moneyline", 100],
    //                 },
    //               ],
    //             },
    //             100,
    //           ],
    //         },
    //         else: {
    //           $multiply: [
    //             {
    //               $divide: [
    //                 100,
    //                 {
    //                   $add: ["$underdog.moneyline", 100],
    //                 },
    //               ],
    //             },
    //             100,
    //           ],
    //         },
    //       },
    //     },
    //   },
    // },
    // {
    //   $addFields: {
    //     favoriteFoc: {
    //       $divide: [
    //         "$favIP",
    //         {
    //           $add: ["$favIP", "$underIp"],
    //         },
    //       ],
    //     },
    //     underdogFoc: {
    //       $divide: [
    //         "$underIp",
    //         {
    //           $add: ["$underIp", "$favIP"],
    //         },
    //       ],
    //     },
    //   },
    // },
    // {
    //   $addFields: {
    //     favRemovePoint: {
    //       $multiply: ["$favoriteFoc", 100],
    //     },
    //   },
    // },
    // {
    //   $addFields: {
    //     favoriteOdd: {
    //       $toString: {
    //         $round: [
    //           {
    //             $multiply: [
    //               {
    //                 $divide: ["$favRemovePoint", "$underdogFoc"],
    //               },
    //               -1,
    //             ],
    //           },
    //           0,
    //         ],
    //       },
    //     },
    //     underdogOdd: {
    //       $toString: {
    //         $round: [
    //           {
    //             $subtract: [
    //               {
    //                 $divide: [100, "$underdogFoc"],
    //               },
    //               100,
    //             ],
    //           },
    //           0,
    //         ],
    //       },
    //     },
    //   },
    // },

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
        goalServeLeagueId: true,
        awayTeamAbbreviation: "$awayTeam.abbreviation",
        homeTeamAbbreviation: "$homeTeam.abbreviation",
        weekName: true,
        seasonName: true,
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
          // spread: "$odds.awayTeamSpread.handicap",
          // moneyline: {
          //   $cond: {
          //     if: {
          //       $eq: ["$favorite.favorite", "away"],
          //     },
          //     then: {
          //       $cond: {
          //         if: {
          //           $gte: [
          //             {
          //               $toDouble: "$favoriteOdd",
          //             },
          //             0,
          //           ],
          //         },
          //         then: {
          //           $concat: ["+", "$favoriteOdd"],
          //         },
          //         else: "$favoriteOdd",
          //       },
          //     },

          //     else: {
          //       $cond: {
          //         if: {
          //           $gte: [
          //             {
          //               $toDouble: "$underdogOdd",
          //             },
          //             0,
          //           ],
          //         },
          //         then: {
          //           $concat: ["+", "$underdogOdd"],
          //         },
          //         else: "$underdogOdd",
          //       },
          //     },
          //   },
          // },
          // moneylineGoalServe: {
          //   $cond: [
          //     {
          //       $gte: [
          //         {
          //           $toDouble: "$odds.awayTeamMoneyline.us",
          //         },
          //         0,
          //       ],
          //     },
          //     {
          //       $concat: ["+", "$odds.awayTeamMoneyline.us"],
          //     },
          //     "$odds.awayTeamMoneyline.us",
          //   ],
          // },
          // total: "$odds.awayTeamTotal",
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
          // moneyline: {
          //   $cond: {
          //     if: {
          //       $eq: ["$favorite.favorite", "home"],
          //     },
          //     then: {
          //       $cond: {
          //         if: {
          //           $gte: [
          //             {
          //               $toDouble: "$favoriteOdd",
          //             },
          //             0,
          //           ],
          //         },
          //         then: {
          //           $concat: ["+", "$favoriteOdd"],
          //         },
          //         else: "$favoriteOdd",
          //       },
          //     },

          //     else: {
          //       $cond: {
          //         if: {
          //           $gte: [
          //             {
          //               $toDouble: "$underdogOdd",
          //             },
          //             0,
          //           ],
          //         },
          //         then: {
          //           $concat: ["+", "$underdogOdd"],
          //         },
          //         else: "$underdogOdd",
          //       },
          //     },
          //   },
          // },
          // moneylineGoalServe: {
          //   $cond: [
          //     {
          //       $gte: [
          //         {
          //           $toDouble: "$odds.homeTeamMoneyline.us",
          //         },
          //         0,
          //       ],
          //     },
          //     {
          //       $concat: ["+", "$odds.homeTeamMoneyline.us"],
          //     },
          //     "$odds.homeTeamMoneyline.us",
          //   ],
          // },
          // spread: "$odds.homeTeamSpread.handicap",
          // total: "$odds.homeTeamTotal",
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
        status: "Final",
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
        awayTeamAbbreviation: "$awayTeam.abbreviation",
        homeTeamAbbreviation: "$homeTeam.abbreviation",
        weekName: true,
        seasonName: true,
        awayTeam: {
          abbreviation: "$awayTeam.abbreviation",
          awayTeamName: "$awayTeamStandings.name",
          awayTeamId: "$awayTeamStandings._id",
          goalServeAwayTeamId: "$awayTeamStandings.goalServeTeamId",
          awayTeamRun: "$awayTeamTotalScore",
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
          ties: {
            $sum: { $ifNull: [{ $toInt: "$awayTeamStandings.ties" }, 0] },
          },
          isWinner: {
            $cond: {
              if: {
                $regexMatch: {
                  input: "$drive",
                  regex: "$awayTeam.abbreviation",
                },
              },
              then: true,
              else: false,
            },
          },
        },
        homeTeam: {
          abbreviation: "$homeTeam.abbreviation",
          homeTeamName: "$homeTeamStandings.name",
          homeTeamId: "$homeTeamStandings._id",
          goalServeHomeTeamId: "$homeTeamStandings.goalServeTeamId",
          homeTeamRun: "$homeTeamTotalScore",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          ties: {
            $sum: { $ifNull: [{ $toInt: "$homeTeamStandings.ties" }, 0] },
          },
          teamImage: "$homeTeamImage.image",
          isWinner: {
            $cond: {
              if: {
                $regexMatch: {
                  input: "$drive",
                  regex: "$homeTeam.abbreviation",
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
      getLiveDataOfNfl: await getLiveDataOfNfl(data),
    });
    return {
      getUpcomingMatch,
      getFinalMatch,
      getLiveDataOfNfl: await getLiveDataOfNfl(data),
    };
  }
};

const getLiveDataOfNfl = async (data: any) => {
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
              $ne: "Suspended",
            },
          },
        ],
        seasonName: {
          $in: data.calenderData.map((name: any) => name.seasonName),
        },
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
          abbreviation: "$awayTeam.abbreviation",
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
                $regexMatch: {
                  input: "$drive",
                  regex: "$awayTeam.abbreviation",
                },
              },
              then: true,
              else: false,
            },
          },
        },
        homeTeam: {
          abbreviation: "$homeTeam.abbreviation",
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
                $regexMatch: {
                  input: "$drive",
                  regex: "$homeTeam.abbreviation",
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

export default {
  addTeam,
  getCalendar,
  addTeamImage,
  scoreWithDate,
  getLiveDataOfNfl,
  scoreWithWeek
}
