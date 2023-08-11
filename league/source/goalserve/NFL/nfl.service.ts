import NflMatch from "../../models/documents/NFL/match.model";
import NflStandings from "../../models/documents/NFL/standings.model";
import League from "../../models/documents/league.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import { goalserveApi } from "../../services/goalserve.service";

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
<<<<<<< HEAD
    // {
    //   $lookup: {
    //     from: "nflteamimages",
    //     localField: "goalServeTeamId",
    //     foreignField: "goalServeTeamId",
    //     as: "images",
    //   },
    // },
    // {
    //   $unwind: {
    //     path: "$images",
    //     preserveNullAndEmptyArrays: true,
    //   },
    // },
=======
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
>>>>>>> daily/11-08-23
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
              $toString: {
                $subtract: [
                  { $toInt: "$points_for" },
                  {
                    $toInt: "$points_against",
                  },
                ],
              },
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
        Number(team1.win_percentage) - Number(team2.win_percentage)
    );
  }
  getStandingData[0].conference = Object.values(mergedObject);
  const sortedDivisions = getStandingData[0].division.map((division: any) => {
    const sortedTeams = division.teams.sort(
      (team1: any, team2: any) =>
        Number(team1.win_percentage) - Number(team2.win_percentage)
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
      '$addFields': {
        'spliteTime': {
          '$split': [
            '$dateTimeUtc', ' '
          ]
        }
      }
    }, {
      '$addFields': {
        'dateutc': {
          '$toDate': '$dateTimeUtc'
        }
      }
    }, {
      '$sort': {
        'dateutc': 1
      }
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
      },
    },
    {
      $group: {
        _id: "$_id.seasonName",
        weekItem: {
          $push: {
            title: "$_id.weekName",
            dates: "$dates",
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
        seasonName:data.seasonName,
        weekName:data.weekName,
        status: "Not Started",
      },
    },
    // {
    //   $lookup: {
    //     from: "nhlteams",
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
    // {
    //   $lookup: {
    //     from: "nhlodds",
    //     localField: "goalServeMatchId",
    //     foreignField: "goalServeMatchId",
    //     as: "odds",
    //   },
    // },
    // {
    //   $sort: {
    //     formattedDate: 1,
    //     time: 1,
    //   },
    // },
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
          awayTeamName: "$awayTeamStandings.name",
          awayTeamId: "$awayTeamStandings._id",
          goalServeAwayTeamId: "$awayTeamStandings.goalServeTeamId",
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
          homeTeamName: "$homeTeamStandings.name",
          homeTeamId: "$homeTeamStandings._id",
          goalServeHomeTeamId: "$homeTeamStandings.goalServeTeamId",
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
  const getFinalMatch = await NflMatch.aggregate([
   
    {
      $match: {
        seasonName:data.seasonName,
        weekName:data.weekName,
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
    return { getUpcomingMatch, getFinalMatch };
  }
};

export default { addStanding, getStandings, getCalendar, scoreWithDate };
