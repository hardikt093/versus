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
  try {
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
    var daylist = getDaysArray(new Date("2023-08-10"), new Date("2023-08-10"));

    for (let i = 0; i < daylist?.length; i++) {
      const getMatch: any = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/nfl-scores`,
        { json: true, date: daylist[i] }
      );
      const matchArray = await getMatch?.data?.scores?.category?.match;
      // console.log("matchArray", matchArray);
      const league: ILeagueModel | undefined | null = await League.findOne({
        goalServeLeagueId: getMatch?.data?.scores?.category?.id,
      });
      if (matchArray?.length > 0 && matchArray) {
        for (let i = 0; i < matchArray?.length; i++) {
          const match: INflMatchModel | null = await NflMatch.findOne({
            goalServeMatchId: matchArray[i]?.contestID,
          });
          if (match) {
            const data: Partial<INflMatchModel> = {
              attendance: matchArray[i]?.attendance,
              goalServeHomeTeamId: matchArray[i]?.hometeam.id,
              goalServeAwayTeamId: matchArray[i]?.awayteam.id,

              date: matchArray[i]?.date,
              dateTimeUtc: matchArray[i]?.datetime_utc,
              formattedDate: matchArray[i]?.formatted_date,
              status: matchArray[i]?.status,
              time: matchArray[i]?.time,
              timezone: matchArray[i]?.timezone,
              goalServeVenueId: matchArray[i]?.venue_id,
              venueName: matchArray[i]?.venue,
              homeTeamTotalScore: matchArray[i]?.hometeam.totalscore,
              awayTeamTotalScore: matchArray[i]?.awayteam.totalscore,

              timer: matchArray[i]?.timer ? matchArray[i]?.timer : "",
              awayTeamOt: matchArray[i]?.awayteam.ot,
              awayTeamQ1: matchArray[i]?.awayteam.q1,
              awayTeamQ2: matchArray[i]?.awayteam.q2,
              awayTeamQ3: matchArray[i]?.awayteam.q3,
              awayTeamQ4: matchArray[i]?.awayteam.q4,
              awayTeamBallOn: matchArray[i]?.awayteam.ball_on,
              awayTeamDrive: matchArray[i]?.awayteam.drive,
              awayTeamNumber: matchArray[i]?.awayteam.number,

              homeTeamOt: matchArray[i]?.hometeam.ot,
              homeTeamQ1: matchArray[i]?.hometeam.q1,
              homeTeamQ2: matchArray[i]?.hometeam.q2,
              homeTeamQ3: matchArray[i]?.hometeam.q3,
              homeTeamQ4: matchArray[i]?.hometeam.q4,
              homeTeamBallOn: matchArray[i]?.awayteam.ball_on
                ? matchArray[i]?.awayteam.ball_on
                : "",
              homeTeamDrive: matchArray[i]?.hometeam.drive
                ? matchArray[i]?.hometeam.drive
                : "",
              homeTeamNumber: matchArray[i]?.hometeam.number
                ? matchArray[i]?.hometeam.number
                : "",
              awayTeamDefensive: matchArray[i]?.defensive?.awayteam?.player,
              homeTeamDefensive: matchArray[i]?.defensive?.hometeam?.player,

              firstQuarterEvent: matchArray[i]?.events?.firstquarter?.event,
              fourthQuarterEvent: matchArray[i]?.events?.fourthquarter?.event,
              overtimeEvent: matchArray[i]?.events?.overtime?.event,
              secondQuarterEvent: matchArray[i]?.events?.secondquarter?.event,
              thirdQuarterEvent: matchArray[i]?.events?.thirdquarter?.event,

              awayTeamFumbles: matchArray[i]?.fumbles?.awayteam?.player,
              homeTeamFumbles: matchArray[i]?.fumbles?.hometeam?.player,

              awayTeamInterceptions: matchArray[i]?.interceptions?.awayteam?.player,
              homeTeamInterceptions: matchArray[i]?.interceptions?.hometeam?.player,

              awayTeamKickReturn:matchArray[i]?.kick_returns?.awayteam?.player,
              homeTeamKickReturn:matchArray[i]?.kick_returns?.hometeam?.player,

              awayTeamKick:matchArray[i]?.kicking?.awayteam?.player
            };
            console.log("data", data);
            // const matchData = new NflMatch(data);
            // await matchData.save();
          }
        }
      } else {
        if (matchArray) {
          const match: INflMatchModel | null = await NflMatch.findOne({
            goalServeMatchId: matchArray?.contestID,
          });
          console.log("match", match);
        }
      }
    }
  } catch (error) {
    console.log("error", error);
  }
};

export default {
  addStanding,
  getStandings,
  getCalendar,
  scoreWithDate,
  addFinalMatch,
};
