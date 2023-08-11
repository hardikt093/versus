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
  getStandingData[0].conference = Object.values(mergedObject);

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
        seasonName: data.seasonName,
        weekName: data.weekName,
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
        seasonName: data.seasonName,
        weekName: data.weekName,
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
     
    }
    else{
      if(matchArray){

      }
    }

  }
};

export default {
  addStanding,
  getStandings,
  getCalendar,
  scoreWithDate,
  addFinalMatch,
};
