import { axiosGet } from "../../services/axios.service";
import { goalserveApi } from "../../services/goalserve.service";
import socketService from "../../services/socket.service";
import League from "../../models/documents/league.model";
import moment from "moment";
import { isArray } from "lodash";
import TeamNHL from "../../models/documents/NHL/team.model";
import NhlMatch from "../../models/documents/NHL/match.model";
import PlayersNHL from "../../models/documents/NHL/player.model";
import NhlInjury from "../../models/documents/NHL/injury.model";
import NhlStandings from "../../models/documents/NHL/standing,model";
import NhlOdds from "../../models/documents/NHL/odds.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import ITeamNHLModel from "../../models/interfaces/teamNHL.interface";
import INhlMatchModel from "../../models/interfaces/nhlMatch.interface";
function removeByAttr(arr: any, attr: string, value: number) {
  let i = arr.length;
  while (i--) {
    if (
      arr[i] &&
      arr[i].hasOwnProperty(attr) &&
      arguments.length > 2 &&
      arr[i][attr] === value
    ) {
      arr.splice(i, 1);
    }
  }
  return arr;
}
const getTotal = (nameKey: string, myArray: any) => {
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

const getRunLine = async (nameKey: string, myArray: any) => {
  for (let i = 0; i < myArray?.length; i++) {
    if (myArray[i].name.split(" ").slice(0, -1).join(" ") == nameKey) {
      return myArray[i];
    }
  }
};

const search = async (nameKey: string, myArray: any) => {
  for (let i = 0; i < myArray?.length; i++) {
    if (myArray[i].id === nameKey) {
      return myArray[i];
    }
  }
  return;
};

const getOdds = (nameKey: string, myArray: any) => {
  for (let i = 0; i < myArray?.length; i++) {
    if (myArray[i].value == nameKey) {
      return myArray[i];
    }
  }
};

const addNhlMatch = async () => {
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
    var daylist = getDaysArray(new Date("2023-06-04"), new Date("2023-06-06"));
    for (let i = 0; i < daylist?.length; i++) {
      const getMatch = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/hockey/nhl-scores`,
        { json: true, date: daylist[i] }
      );
      const matchArray = await getMatch?.data?.scores?.category?.match;
      const league: ILeagueModel | undefined | null = await League.findOne({
        goalServeLeagueId: getMatch?.data.scores.category.id,
      });
      if (matchArray?.length > 0 && matchArray) {
        // array logic
        for (let j = 0; j < matchArray?.length; j++) {
          const data: Partial<INhlMatchModel> = {
            goalServeLeagueId: league?.goalServeLeagueId,
            date: matchArray[j]?.date,
            formattedDate: matchArray[j]?.formatted_date,
            timezone: matchArray[j]?.timezone,
            attendance: matchArray[j]?.attendance,
            goalServeMatchId: matchArray[j]?.id,
            dateTimeUtc: matchArray[j]?.datetime_utc,
            status: matchArray[j]?.status,
            time: matchArray[j]?.time,
            goalServeVenueId: matchArray[j]?.venue_id,
            venueName: matchArray[j]?.venue_name,
            homeTeamTotalScore: matchArray[j]?.hometeam?.totalscore,
            awayTeamTotalScore: matchArray[j]?.awayteam?.totalscore,
            // new entries
            timer: matchArray[j]?.timer ? matchArray[j]?.timer : "",
            isPp: matchArray[j]?.is_pp ? matchArray[j]?.is_pp : "",
            ppTime: matchArray[j]?.pp_time ? matchArray[j]?.pp_time : "",
            awayTeamOt: matchArray[j]?.awayteam?.ot,
            awayTeamP1: matchArray[j]?.awayteam?.p1,
            awayTeamP2: matchArray[j]?.awayteam?.p2,
            awayTeamP3: matchArray[j]?.awayteam?.p3,
            awayTeamPp: matchArray[j]?.awayteam?.pp,
            awayTeamSo: matchArray[j]?.awayteam?.so,

            homeTeamOt: matchArray[j]?.hometeam?.ot,
            homeTeamP1: matchArray[j]?.hometeam?.p1,
            homeTeamP2: matchArray[j]?.hometeam?.p2,
            homeTeamP3: matchArray[j]?.hometeam?.p3,
            homeTeamPp: matchArray[j]?.hometeam?.pp,
            homeTeamSo: matchArray[j]?.hometeam.so,

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

          const teamIdAway: ITeamNHLModel | null | undefined =
            await TeamNHL.findOne({
              goalServeTeamId: matchArray[j].awayteam.id,
            });

          data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 1;

          const teamIdHome: ITeamNHLModel | null | undefined =
            await TeamNHL.findOne({
              goalServeTeamId: matchArray[j].hometeam.id,
            });

          data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 1;

          const matchData = new NhlMatch(data);
          await matchData.save();
        }
      } else {
        if (matchArray) {
          const data: Partial<INhlMatchModel> = {
            goalServeLeagueId: league?.goalServeLeagueId,
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

          const teamIdAway: ITeamNHLModel | null | undefined =
            await TeamNHL.findOne({
              goalServeTeamId: matchArray.awayteam.id,
            });
          if (teamIdAway) {
            data.awayTeamId = teamIdAway?.id;
            data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
              ? teamIdAway.goalServeTeamId
              : 0;
          }
          const teamIdHome: ITeamNHLModel | null | undefined =
            await TeamNHL.findOne({
              goalServeTeamId: matchArray.hometeam.id,
            });
          if (teamIdHome) {
            data.homeTeamId = teamIdHome?.id;
            data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
              ? teamIdHome.goalServeTeamId
              : 0;
          }
          const matchData = new NhlMatch(data);
          await matchData.save();
        }
      }
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
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

const nhlSingleGameBoxScore = async (goalServeMatchId: string) => {
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
        from: "nhlodds",
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
          awayTeamName: "$awayTeam.name",
          goalServeAwayTeamId: "$goalServeAwayTeamId",
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
          goalServeHomeTeamId: "$goalServeHomeTeamId",
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
        scoringSummary: [
          { title: "Period 1", child: "$scoringFirstperiod" },
          { title: "Period 2", child: "$scoringSecondperiod" },
          { title: "Period 3", child: "$scoringThirdperiod" },
          { title: "Overtime", child: "$scoringOvertime" },
        ],
        scoring: {
          awayTeam: [
            {
              title: "Period 1",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamP1", ""] },
                  then: "-",
                  else: "$awayTeamP1",
                },
              },
            },
            {
              title: "Period 2",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamP2", ""] },
                  then: "-",
                  else: "$awayTeamP2",
                },
              },
            },
            {
              title: "Period 3",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamP3", ""] },
                  then: "-",
                  else: "$awayTeamP3",
                },
              },
            },
            {
              title: "Overtime",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamOt", ""] },
                  then: "-",
                  else: "$awayTeamOt",
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
              title: "Period 1",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamP1", ""] },
                  then: "-",
                  else: "$homeTeamP1",
                },
              },
            },
            {
              title: "Period 2",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamP2", ""] },
                  then: "-",
                  else: "$homeTeamP2",
                },
              },
            },
            {
              title: "Period 3",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamP3", ""] },
                  then: "-",
                  else: "$homeTeamP3",
                },
              },
            },
            {
              title: "Overtime",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamOt", ""] },
                  then: "-",
                  else: "$homeTeamOt",
                },
              },
            },
            {
              title: "Total",
              score: "$homeTeamTotalScore",
            },
          ],
        },
        penaltySummary: [
          { title: "Period 1", child: "$penaltiesFirstperiod" },
          { title: "Period 2", child: "$penaltiesSecondperiod" },
          { title: "Period 3", child: "$penaltiesThirdperiod" },
          { title: "Overtime", child: "$penaltiesOvertime" },
        ],
        goalKeeperReasult: {
          homeTeam: "$goalkeeperStatsHomeTeam",
          awayTeam: "$goalkeeperStatsAwayTeam",
        },
        teamStatistics: [
          {
            title: "Faceoffs won",
            homeTeam: "$teamStatsHomeTeam.faceoffs_won.total",
            awayTeam: "$teamStatsAwayTeam.faceoffs_won.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.faceoffs_won.total",
                      to: "int",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.faceoffs_won.total",
                      to: "int",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                ],
              },
            },
          },
          {
            title: "Penalties",
            homeTeam: "$teamStatsHomeTeam.penalty_minutes.total",
            awayTeam: "$teamStatsAwayTeam.penalty_minutes.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.penalty_minutes.total",
                      to: "int",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.penalty_minutes.total",
                      to: "int",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                ],
              },
            },
          },
          {
            title: "Hits",
            homeTeam: "$teamStatsHomeTeam.hits.total",
            awayTeam: "$teamStatsAwayTeam.hits.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.hits.total",
                      to: "int",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.hits.total",
                      to: "int",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                ],
              },
            },
          },
          {
            title: "Shots",
            awayTeam: "$teamStatsAwayTeam.shots.total",
            homeTeam: "$teamStatsHomeTeam.shots.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.shots.total",
                      to: "int",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.shots.total",
                      to: "int",
                      onError: 0,
                      onNull: 0,
                    },
                  },
                ],
              },
            },
          },
        ],
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

const addMatchDataFutureForNhl = async () => {
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
    var daylist = getDaysArray(new Date("2023-05-25"), new Date("2023-05-31"));
    for (let i = 0; i < daylist?.length; i++) {
      const getMatch = await axiosGet(
        `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/hockey/nhl-shedule`,
        { json: true, date1: daylist[i] }
      );
      const matchArray = await getMatch?.data?.shedules?.matches?.match;
      const league: ILeagueModel | undefined | null = await League.findOne({
        goalServeLeagueId: getMatch?.data?.shedules?.id,
      });
      if (matchArray?.length > 0 && matchArray) {
        // array logic
        for (let j = 0; j < matchArray?.length; j++) {
          const data: Partial<INhlMatchModel> = {
            goalServeLeagueId: league?.goalServeLeagueId,
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

          const teamIdAway: ITeamNHLModel | null | undefined =
            await TeamNHL.findOne({
              goalServeTeamId: matchArray[j].awayteam.id,
            });

          data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 1;

          const teamIdHome: ITeamNHLModel | null | undefined =
            await TeamNHL.findOne({
              goalServeTeamId: matchArray[j].hometeam.id,
            });

          data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 1;
          const matchData = new NhlMatch(data);
          await matchData.save();
        }
      } else {
        if (matchArray) {
          const data: Partial<INhlMatchModel> = {
            goalServeLeagueId: league?.goalServeLeagueId,
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

          const teamIdAway: ITeamNHLModel | null | undefined =
            await TeamNHL.findOne({
              goalServeTeamId: matchArray.awayteam.id,
            });
          if (teamIdAway) {
            data.awayTeamId = teamIdAway?.id;
            data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
              ? teamIdAway.goalServeTeamId
              : 0;
          }
          const teamIdHome: ITeamNHLModel | null | undefined =
            await TeamNHL.findOne({
              goalServeTeamId: matchArray.hometeam.id,
            });
          if (teamIdHome) {
            data.homeTeamId = teamIdHome?.id;
            data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
              ? teamIdHome.goalServeTeamId
              : 0;
          }
          const matchData = new NhlMatch(data);
          await matchData.save();
        }
      }
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
};

const nhlScoreWithDate = async (date1: string, type: string) => {
  const date2 = moment(date1).add(24, "hours").utc().toISOString();

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
        from: "nhlodds",
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
      $addFields: {
        dateInString: {
          $toDate: "$dateTimeUtc",
        },
      },
    },
    {
      $sort: {
        dateInString: 1,
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
          homeTeamId: "$homeTeam._id",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
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
      $addFields: {
        dateInString: {
          $toDate: "$dateTimeUtc",
        },
      },
    },
    {
      $sort: {
        dateInString: 1,
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
const getLiveDataOfNhl = async (date1: string) => {
  const date2 = moment(date1).add(24, "hours").utc().toISOString();

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
            else: "$status",
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
      $addFields: {
        dateInString: {
          $toDate: "$dateTimeUtc",
        },
      },
    },
    {
      $sort: {
        dateInString: 1,
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
          goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
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
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
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
  await socketService.socket("nhlLiveMatch", {
    getLiveDataOfNhl,
  });
  return getLiveDataOfNhl;
};
const nhlScoreWithCurrentDate = async (date1: string) => {
  return {
    getLiveMatch: await getLiveDataOfNhl(date1),
    getUpcomingMatch: await nhlScoreWithDate(date1, "upcoming"),
    getFinalMatch: await nhlScoreWithDate(date1, "final"),
  };
};
const nhlGetTeam = async (goalServeTeamId: string) => {
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
              from: "nhlteamimages",
              localField: "goalServeTeamId",
              foreignField: "goalServeTeamId",
              as: "teamImage",
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
              teamImage: { $arrayElemAt: ["$teamImage.image", 0] },
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
            $sort: {
              dateUtc: -1,
            },
          },
          {
            $limit: 5,
          },
          {
            $lookup: {
              from: "nhlteams",
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
                    from: "nhlteamimages",
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
              from: "nhlodds",
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
      $lookup: {
        from: "nhlplayers",
        let: {
          goalServeTeamId: "$goalServeTeamId",
        },

        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$goalServeTeamId", "$$goalServeTeamId"],
                  },
                  { $eq: ["$isGoalKeeper", false] },
                ],
              },
            },
          },
          {
            $addFields: {
              goals: {
                $toInt: "$goals",
              },
              assists: {
                $toInt: "$assists",
              },
              points: {
                $toInt: "$points",
              },
              penalty_minutes: {
                $toInt: "$penalty_minutes",
              },
              plus_minus: {
                $toInt: "$plus_minus",
              },
            },
          },
          {
            $facet: {
              maxGoalScorer: [
                {
                  $sort: {
                    goals: -1,
                  },
                },
                {
                  $limit: 1,
                },
              ],
              maxAssistProvider: [
                {
                  $sort: {
                    assists: -1,
                  },
                },
                {
                  $limit: 1,
                },
              ],
              maxPointsEarned: [
                {
                  $sort: {
                    points: -1,
                  },
                },
                {
                  $limit: 1,
                },
              ],
              maxPenalty_minutes: [
                {
                  $sort: {
                    penalty_minutes: -1,
                  },
                },
                {
                  $limit: 1,
                },
              ],
              maxPlus_minus: [
                {
                  $sort: {
                    plus_minus: -1,
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
              maxGoalScorer: {
                $arrayElemAt: ["$maxGoalScorer", 0],
              },
              maxAssistProvider: {
                $arrayElemAt: ["$maxAssistProvider", 0],
              },
              maxPointsEarned: {
                $arrayElemAt: ["$maxPointsEarned", 0],
              },
              maxPenalty_minutes: {
                $arrayElemAt: ["$maxPenalty_minutes", 0],
              },
              maxPlus_minus: {
                $arrayElemAt: ["$maxPlus_minus", 0],
              },
            },
          },
          {
            $project: {
              maxAssistProvider: {
                assists: "$maxAssistProvider.assists",
                name: "$maxAssistProvider.name",
                number: "$maxAssistProvider.number",
              },
              maxGoalScorer: {
                goals: "$maxGoalScorer.goals",
                name: "$maxGoalScorer.name",
                number: "$maxGoalScorer.number",
              },
              maxPointsEarned: {
                points: "$maxPointsEarned.points",
                name: "$maxPointsEarned.name",
                number: "$maxPointsEarned.number",
              },
              maxPenalty_minutes: {
                penalty_minutes: "$maxPenalty_minutes.penalty_minutes",
                name: "$maxPenalty_minutes.name",
                number: "$maxPenalty_minutes.number",
              },
              maxPlus_minus: {
                plus_minus: "$maxPlus_minus.plus_minus",
                name: "$maxPlus_minus.name",
                number: "$maxPlus_minus.number",
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
          $arrayElemAt: [
            {
              $split: ["$last_ten", ","],
            },
            0,
          ],
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
                      cond: {
                        $eq: ["$$player.position", "$$pos"],
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
                    shot: "$$player.shot",
                    goalServePlayerId: "$$player.goalServePlayerId",
                    number: "$$player.number",
                  },
                },
              },
            },
          },
        },
        playerSkatingStats: {
          allPlayerStats: {
            $map: {
              input: {
                $filter: {
                  input: "$teamPlayers",
                  as: "item",
                  cond: { $eq: ["$$item.isGoalKeeper", false] },
                },
              },
              as: "item",
              in: {
                games_played: "$$item.games_played",
                goals: "$$item.goals",
                assists: "$$item.assists",
                points: "$$item.points",
                plus_minus: "$$item.plus_minus",
                name: "$$item.name",
                goalServePlayerId: "$$item.goalServePlayerId",
                penalty_minutes: "$$item.penalty_minutes",
                shifts: "$$item.shifts",
                game_winning_goals: "$$item.game_winning_goals",
                faceoffs_lost: "$$item.faceoffs_lost",
                faceoffs_pct: "$$item.faceoffs_pct",
                faceoffs_won: "$$item.faceoffs_won",
              },
            },
          },
          total: {
            name: "Total",
            games_played: {
              $max: {
                $map: {
                  input: {
                    $filter: {
                      input: "$teamPlayers",
                      as: "item",
                      cond: { $eq: ["$$item.isGoalKeeper", false] },
                    },
                  },
                  as: "item",
                  in: {
                    $toInt: "$$item.games_played", // Convert the string to an integer
                  },
                },
              },
            },

            plus_minus: "-",
            goals: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$teamPlayers",
                      as: "item",
                      cond: { $eq: ["$$item.isGoalKeeper", false] },
                    },
                  },
                  as: "item",
                  in: {
                    $toInt: "$$item.goals", // Convert the string to an integer
                  },
                },
              },
            },

            assists: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$teamPlayers",
                      as: "item",
                      cond: { $eq: ["$$item.isGoalKeeper", false] },
                    },
                  },
                  as: "item",
                  in: {
                    $toInt: "$$item.assists", // Convert the string to an integer
                  },
                },
              },
            },

            points: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$teamPlayers",
                      as: "item",
                      cond: { $eq: ["$$item.isGoalKeeper", false] },
                    },
                  },
                  as: "item",
                  in: {
                    $toDouble: "$$item.points", // Convert the string to an integer
                  },
                },
              },
            },

            penalty_minutes: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$teamPlayers",
                      as: "item",
                      cond: { $eq: ["$$item.isGoalKeeper", false] },
                    },
                  },
                  as: "item",
                  in: {
                    $toDouble: "$$item.penalty_minutes", // Convert the string to an integer
                  },
                },
              },
            },

            game_winning_goals: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$teamPlayers",
                      as: "item",
                      cond: { $eq: ["$$item.isGoalKeeper", false] },
                    },
                  },
                  as: "item",
                  in: {
                    $toDouble: "$$item.game_winning_goals", // Convert the string to an integer
                  },
                },
              },
            },
            faceoffs_lost: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$teamPlayers",
                      as: "item",
                      cond: { $eq: ["$$item.isGoalKeeper", false] },
                    },
                  },
                  as: "item",
                  in: {
                    $toDouble: "$$item.faceoffs_lost", // Convert the string to an integer
                  },
                },
              },
            },
            faceoffs_pct: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$teamPlayers",
                      as: "item",
                      cond: { $eq: ["$$item.isGoalKeeper", false] },
                    },
                  },
                  as: "item",
                  in: {
                    $toDouble: "$$item.faceoffs_pct", // Convert the string to an integer
                  },
                },
              },
            },
            faceoffs_won: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$teamPlayers",
                      as: "item",
                      cond: { $eq: ["$$item.isGoalKeeper", false] },
                    },
                  },
                  as: "item",
                  in: {
                    $toDouble: "$$item.faceoffs_won", // Convert the string to an integer
                  },
                },
              },
            },
            shifts: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$teamPlayers",
                      as: "item",
                      cond: { $eq: ["$$item.isGoalKeeper", false] },
                    },
                  },
                  as: "item",
                  in: {
                    $toDouble: "$$item.shifts", // Convert the string to an integer
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
                opposingTeam: {
                  $arrayElemAt: ["$$item.opposingTeam", 0],
                },
                goalie: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $gt: [{ $size: "$$item.goalkeeperStatsAwayTeam" }, 0],
                        },
                        {
                          $eq: [
                            "$goalServeTeamId",
                            "$$item.goalServeAwayTeamId",
                          ],
                        },
                      ],
                    },
                    then: {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: "$$item.goalkeeperStatsAwayTeam",
                            as: "val",
                            in: "$$val.name",
                          },
                        },
                        0,
                      ],
                    },
                    else: {
                      $cond: {
                        if: {
                          $gt: [{ $size: "$$item.goalkeeperStatsHomeTeam" }, 0],
                        },
                        then: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: "$$item.goalkeeperStatsHomeTeam",
                                as: "val",
                                in: "$$val.name",
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
                oppositeGoalie: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $gt: [{ $size: "$$item.goalkeeperStatsAwayTeam" }, 0],
                        },
                        {
                          $ne: [
                            "$goalServeTeamId",
                            "$$item.goalServeAwayTeamId",
                          ],
                        },
                      ],
                    },
                    then: {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: "$$item.goalkeeperStatsAwayTeam",
                            as: "val",
                            in: "$$val.name",
                          },
                        },
                        0,
                      ],
                    },
                    else: {
                      $cond: {
                        if: {
                          $gt: [{ $size: "$$item.goalkeeperStatsHomeTeam" }, 0],
                        },
                        then: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: "$$item.goalkeeperStatsHomeTeam",
                                as: "val",
                                in: "$$val.name",
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
  return getTeam[0];
};

const updateCurruntDateRecordNhl = async () => {
  try {
    const getMatch = await axiosGet(
      `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/hockey/nhl-scores`,
      { json: true }
    );
    const matchArray = await getMatch?.data?.scores?.category?.match;
    const league: ILeagueModel | undefined | null = await League.findOne({
      goalServeLeagueId: getMatch?.data.scores.category.id,
    });
    if (matchArray?.length > 0 && matchArray) {
      // array logic
      for (let j = 0; j < matchArray?.length; j++) {
        const data: Partial<INhlMatchModel> = {
          goalServeLeagueId: league?.goalServeLeagueId,
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

        const teamIdAway: ITeamNHLModel | null | undefined =
          await TeamNHL.findOne({
            goalServeTeamId: matchArray[j].awayteam.id,
          });

        data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
          ? teamIdAway.goalServeTeamId
          : 1;

        const teamIdHome: ITeamNHLModel | null | undefined =
          await TeamNHL.findOne({
            goalServeTeamId: matchArray[j].hometeam.id,
          });

        data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
          ? teamIdHome.goalServeTeamId
          : 1;
        const recordUpdate = await NhlMatch.findOneAndUpdate(
          { goalServeMatchId: data.goalServeMatchId },
          { $set: data },
          { new: true }
        );
      }
    } else {
      if (matchArray) {
        const data: Partial<INhlMatchModel> = {
          goalServeLeagueId: league?.goalServeLeagueId,
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

        const teamIdAway: ITeamNHLModel | null | undefined =
          await TeamNHL.findOne({
            goalServeTeamId: matchArray.awayteam.id,
          });
        if (teamIdAway) {
          data.awayTeamId = teamIdAway?.id;
          data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 0;
        }
        const teamIdHome: ITeamNHLModel | null | undefined =
          await TeamNHL.findOne({
            goalServeTeamId: matchArray.hometeam.id,
          });
        if (teamIdHome) {
          data.homeTeamId = teamIdHome?.id;
          data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 0;
        }
        const recordUpdate = await NhlMatch.findOneAndUpdate(
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

const nhlSingleGameBoxScoreUpcomming = async (goalServeMatchId: string) => {
  const getMatch = await NhlMatch.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },
    {
      $lookup: {
        from: "nhlteams",
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
        from: "nhlstandings",
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
        from: "nhlteamimages",
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
      $lookup: {
        from: "nhlplayers",
        let: {
          awayTeamId: "$goalServeAwayTeamId",
          homeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $in: ["$goalServeTeamId", ["$$awayTeamId", "$$homeTeamId"]],
                  },
                  { $eq: ["$isGoalKeeper", false] },
                ],
              },
            },
          },
        ],
        as: "players",
      },
    },
    {
      $lookup: {
        from: "nhlodds",
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
        from: "nhlodds",
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
        id: 1,
        attendance: 1,
        status: 1,
        venueName: 1,
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
                    number: "$$player.number",
                    games_played: "$$player.games_played",
                    points: "$$player.points",
                    assists: "$$player.assists",
                    plus_minus: "$$player.plus_minus",
                    goals: "$$player.goals",
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
                    number: "$$player.number",
                    games_played: "$$player.games_played",
                    points: "$$player.points",
                    assists: "$$player.assists",
                    goals_against_diff: "$$player.goals_against_diff",
                    plus_minus: "$$player.plus_minus",
                    goals: "$$player.goals",
                  },
                ],
              },
            },
          },
        },
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
        teamStatistics: [
          {
            title: "Wins",
            homeTeam: { $arrayElemAt: ["$standings.homeTeam.won", 0] },
            awayTeam: { $arrayElemAt: ["$standings.awayTeam.won", 0] },
            total: {
              $add: [
                {
                  $toInt: { $arrayElemAt: ["$standings.homeTeam.won", 0] },
                },
                {
                  $toInt: { $arrayElemAt: ["$standings.awayTeam.won", 0] },
                },
              ],
            },
          },
          {
            title: "Goals Scored",
            homeTeam: { $arrayElemAt: ["$standings.homeTeam.goals_for", 0] },
            awayTeam: { $arrayElemAt: ["$standings.awayTeam.goals_for", 0] },
            total: {
              $add: [
                {
                  $toInt: {
                    $arrayElemAt: ["$standings.homeTeam.goals_for", 0],
                  },
                },
                {
                  $toInt: {
                    $arrayElemAt: ["$standings.awayTeam.goals_for", 0],
                  },
                },
              ],
            },
          },
          {
            title: "Goals Against",
            homeTeam: {
              $arrayElemAt: ["$standings.homeTeam.goals_against", 0],
            },
            awayTeam: {
              $arrayElemAt: ["$standings.awayTeam.goals_against", 0],
            },
            total: {
              $add: [
                {
                  $toInt: {
                    $arrayElemAt: ["$standings.awayTeam.goals_against", 0],
                  },
                },
                {
                  $toInt: {
                    $arrayElemAt: ["$standings.homeTeam.goals_against", 0],
                  },
                },
              ],
            },
          },
          {
            title: "Losses",
            homeTeam: { $arrayElemAt: ["$standings.homeTeam.lost", 0] },
            awayTeam: { $arrayElemAt: ["$standings.awayTeam.lost", 0] },
            total: {
              $add: [
                {
                  $toInt: { $arrayElemAt: ["$standings.awayTeam.lost", 0] },
                },
                {
                  $toInt: { $arrayElemAt: ["$standings.homeTeam.lost", 0] },
                },
              ],
            },
          },
        ],
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

const nhlSingleGameBoxScoreLive = async (goalServeMatchId: string) => {
  const getMatch = await NhlMatch.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },
    {
      $lookup: {
        from: "nhlteams",
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
        from: "nhlteamimages",
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
        from: "nhlstandings",
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
        statusWithPeriod: {
          $regexMatch: {
            input: "$status",
            regex: new RegExp("[0-9]"),
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
      $lookup: {
        from: "nhlodds",
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
      $project: {
        id: 1,
        attendance: 1,
        statusWithCondition: 1,
        status: {
          $cond: {
            if: {
              $eq: ["$statusWithPeriod", true],
            },
            then: {
              $concat: ["Period ", "", "$status"],
            },
            else: "$status",
          },
        },
        venueName: 1,

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
        scoringSummary: [
          { title: "Period 1", child: "$scoringFirstperiod" },
          { title: "Period 2", child: "$scoringSecondperiod" },
          { title: "Period 3", child: "$scoringThirdperiod" },
          { title: "Overtime", child: "$scoringOvertime" },
        ],
        scoring: {
          awayTeam: [
            {
              title: "Period 1",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamP1", "0"] },
                  then: "-",
                  else: "$awayTeamP1",
                },
              },
            },
            {
              title: "Period 2",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamP2", "0"] },
                  then: "-",
                  else: "$awayTeamP2",
                },
              },
            },
            {
              title: "Period 3",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamP3", "0"] },
                  then: "-",
                  else: "$awayTeamP3",
                },
              },
            },
            {
              title: "Overtime",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamOt", "0"] },
                  then: "-",
                  else: "$awayTeamOt",
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
              title: "Period 1",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamP1", "0"] },
                  then: "-",
                  else: "$homeTeamP1",
                },
              },
            },
            {
              title: "Period 2",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamP2", "0"] },
                  then: "-",
                  else: "$homeTeamP2",
                },
              },
            },
            {
              title: "Period 3",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamP3", "0"] },
                  then: "-",
                  else: "$homeTeamP3",
                },
              },
            },
            {
              title: "Overtime",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamOt", "0"] },
                  then: "-",
                  else: "$homeTeamOt",
                },
              },
            },
            {
              title: "Total",
              score: "$homeTeamTotalScore",
            },
          ],
        },
        penaltySummary: [
          { title: "Period 1", child: "$penaltiesFirstperiod" },
          { title: "Period 2", child: "$penaltiesSecondperiod" },
          { title: "Period 3", child: "$penaltiesThirdperiod" },
          { title: "Overtime", child: "$penaltiesOvertime" },
        ],
        goalKeeperReasult: {
          homeTeam: "$goalkeeperStatsHomeTeam",
          awayTeam: "$goalkeeperStatsAwayTeam",
        },

        teamStatistics: [
          {
            title: "Takeaways",
            homeTeam: "$teamStatsHomeTeam.takeaways.total",
            awayTeam: "$teamStatsAwayTeam.takeaways.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.takeaways.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.takeaways.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                ],
              },
            },
          },
          {
            title: "Goals",
            homeTeam: "$homeTeamTotalScore",
            awayTeam: "$awayTeamTotalScore",
            total: {
              $sum: [
                "$homeTeamTotalScoreInNumber",
                "$awayTeamTotalScoreInNumber",
              ],
            },
          },
          {
            title: "Faceoffs won",
            homeTeam: "$teamStatsHomeTeam.faceoffs_won.total",
            awayTeam: "$teamStatsAwayTeam.faceoffs_won.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.faceoffs_won.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.faceoffs_won.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                ],
              },
            },
          },
          {
            title: "Penalty Minutes",
            homeTeam: "$teamStatsHomeTeam.penalty_minutes.total",
            awayTeam: "$teamStatsAwayTeam.penalty_minutes.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.penalty_minutes.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.penalty_minutes.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                ],
              },
            },
          },
          {
            title: "Hits",
            homeTeam: "$teamStatsHomeTeam.hits.total",
            awayTeam: "$teamStatsAwayTeam.hits.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.hits.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.hits.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                ],
              },
            },
          },
          {
            title: "Shots",
            awayTeam: "$teamStatsAwayTeam.shots.total",
            homeTeam: "$teamStatsHomeTeam.shots.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.shots.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.shots.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                ],
              },
            },
          },
        ],
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

// for cron
const updateStandingNhl = async () => {
  let data = {
    json: true,
  };
  const getstanding = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    "hockey/nhl-standings"
  );
  const league: ILeagueModel | undefined | null = await League.findOne({
    goalServeLeagueId: getstanding?.data?.standings?.category?.id,
  });
  await Promise.all(
    getstanding?.data?.standings?.category?.league?.map(async (item: any) => {
      await Promise.all(
        item.division.map(async (div: any) => {
          await Promise.all(
            div.team.map(async (team: any) => {
              const teamId: any = await TeamNHL.findOne({
                goalServeTeamId: team.id,
              });
              let data = {
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
              await NhlStandings.findOneAndUpdate(
                { goalServeTeamId: teamId?.goalServeTeamId },
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
const updatePlayersNhl = async () => {
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
      if (statsApi?.data?.statistic?.team?.length > 0) {
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
      mergedArr.map(async (item: any) => {
        await PlayersNHL.findOneAndUpdate(
          { goalServePlayerId: item.goalServePlayerId },
          { $set: item },
          { upsert: true, new: true }
        );
      });
    })
  );
};
const updateInjuredPlayerNHL = async () => {
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
      const existingPlayers = await NhlInjury.find({
        goalServeTeamId: item?.goalServeTeamId,
      });
      if (injuryArray1?.report?.length) {
        const extraEntries = existingPlayers.filter((player) => {
          const playerExists = injuryArray1?.report?.some(
            (val: any) => val?.player_id === player.goalServePlayerId
          );
          return !playerExists;
        });
        await NhlInjury.deleteMany({
          _id: { $in: extraEntries.map((player) => player._id) },
        });
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
            await NhlInjury.updateOne(
              {
                goalServeTeamId: data?.goalServeTeamId,
                goalServePlayerId: data?.goalServePlayerId,
              },
              { $set: data },
              { upsert: true }
            );
          })
        );
      } else if (injuryArray1?.report && !injuryArray1?.report?.length) {
        const extraEntries = existingPlayers.filter((player) => {
          const playerExists = Array(injuryArray1?.report)?.some(
            (val: any) => val?.player_id === player.goalServePlayerId
          );
          return !playerExists;
        });
        await NhlInjury.deleteMany({
          _id: { $in: extraEntries.map((player) => player._id) },
        });
        const val = injuryArray1?.report;
        const player = await PlayersNHL.findOne({
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
        await NhlInjury.updateOne(
          {
            goalServeTeamId: data?.goalServeTeamId,
            goalServePlayerId: data?.goalServePlayerId,
          },
          { $set: data },
          { upsert: true }
        );
      } else {
        await NhlInjury.deleteMany({
          _id: { $in: existingPlayers.map((player) => player._id) },
        });
      }
    })
  );
};

const createAndUpdateOddsNhl = async () => {
  let day = moment().format("D");
  let month = moment().format("MM");
  let year = moment().format("YYYY");
  let date = `${day}.${month}.${year}`;

  try {
    let data = { json: true, date1: date, showodds: "1", bm: "451," };
    const getScore = await goalserveApi(
      "http://www.goalserve.com/getfeed",
      data,
      "hockey/nhl-shedule"
    );
    var matchData = getScore?.data?.shedules?.matches?.match;
    if (matchData?.length > 0) {
      const takeData = await matchData?.map(async (item: any) => {
        if (item.status) {
          const league: any = await League.findOne({
            goalServeLeagueId: getScore?.data?.shedules?.id,
          });
          const findMatchOdds = await NhlOdds.find({
            goalServeMatchId: item?.id,
          });
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
            const getSpread = await getOdds("Puck Line", item?.odds?.type);
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
              status: item?.status,
            };
            const oddsData = new NhlOdds(data);
            const savedOddsData = await oddsData.save();
          } else {
            // getMoneyLine
            const getMoneyLine: any = await getOdds(
              "Home/Away",
              item?.odds?.type
            );
            const awayTeamMoneyline = getMoneyLine?.bookmaker?.odd
              ? getMoneyLine?.bookmaker?.odd?.find(
                  (item: any) => item?.name === "2"
                )
              : {};
            const homeTeamMoneyline = getMoneyLine?.bookmaker?.odd
              ? getMoneyLine?.bookmaker?.odd?.find(
                  (item: any) => item?.name === "1"
                )
              : {};
            // getSpread
            const getSpread = await getOdds("Puck Line", item?.odds?.type);
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
              status: item?.status,
            };
            const updateOdds = await NhlOdds.findOneAndUpdate(
              { goalServeMatchId: item?.id },
              { $set: data },
              { new: true }
            );
          }
        }
      });
    } else {
      if (matchData) {
        const league: any = await League.findOne({
          goalServeLeagueId: getScore?.data?.shedules?.id,
        });
        const findMatchOdds = await NhlOdds.find({
          goalServeMatchId: matchData?.id,
        });
        if (findMatchOdds?.length == 0) {
          // getMoneyLine
          const getMoneyLine: any = await getOdds(
            "Home/Away",
            matchData?.odds?.type
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
          const getSpread = await getOdds("Puck Line", matchData?.odds?.type);
          const getAwayTeamRunLine = await getRunLine(
            matchData?.awayteam?.name,
            getSpread?.bookmaker?.odd
          );
          const getHomeTeamRunLine = await getRunLine(
            matchData?.hometeam?.name,
            getSpread?.bookmaker?.odd
          );
          const awayTeamSpread = getAwayTeamRunLine
            ? getAwayTeamRunLine?.name?.split(" ").slice(-1)[0]
            : "";

          const homeTeamSpread = getHomeTeamRunLine
            ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
            : "";
          const total = await getTotal("Over/Under", matchData?.odds?.type);
          const totalValues = await getTotalValues(total);
          let data = {
            goalServerLeagueId: league.goalServeLeagueId,
            goalServeMatchId: matchData?.id,
            goalServeHomeTeamId: matchData?.hometeam?.id,
            goalServeAwayTeamId: matchData?.awayteam?.id,
            homeTeamSpread: homeTeamSpread,
            homeTeamTotal: totalValues,
            awayTeamSpread: awayTeamSpread,
            awayTeamTotal: totalValues,
            awayTeamMoneyline: awayTeamMoneyline,
            homeTeamMoneyline: homeTeamMoneyline,
            status: matchData?.status,
          };
          const oddsData = new NhlOdds(data);
          const savedOddsData = await oddsData.save();
        } else {
          // getMoneyLine
          const getMoneyLine: any = await getOdds(
            "Home/Away",
            matchData?.odds?.type
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
          const getSpread = await getOdds("Puck Line", matchData?.odds?.type);
          const getAwayTeamRunLine = await getRunLine(
            matchData?.awayteam?.name,
            getSpread?.bookmaker?.odd
          );
          const getHomeTeamRunLine = await getRunLine(
            matchData?.hometeam?.name,
            getSpread?.bookmaker?.odd
          );
          const awayTeamSpread = getAwayTeamRunLine
            ? getAwayTeamRunLine?.name?.split(" ").slice(-1)[0]
            : "";

          const homeTeamSpread = getHomeTeamRunLine
            ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
            : "";
          const total = await getTotal("Over/Under", matchData?.odds?.type);
          const totalValues = await getTotalValues(total);
          let data = {
            goalServerLeagueId: league.goalServeLeagueId,
            goalServeMatchId: matchData?.id,
            goalServeHomeTeamId: matchData?.hometeam?.id,
            goalServeAwayTeamId: matchData?.awayteam?.id,
            homeTeamSpread: homeTeamSpread,
            homeTeamTotal: totalValues,
            awayTeamSpread: awayTeamSpread,
            awayTeamTotal: totalValues,
            awayTeamMoneyline: awayTeamMoneyline,
            homeTeamMoneyline: homeTeamMoneyline,
            status: matchData?.status,
          };
          const updateOdds = await NhlOdds.findOneAndUpdate(
            { goalServeMatchId: matchData?.id },
            { $set: data },
            { new: true }
          );
        }
      }
    }
  } catch (error: any) {
    console.log("error", error);
  }
};

const updateNhlMatch = async () => {
  try {
    const getMatch = await axiosGet(
      `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/hockey/nhl-shedule`,
      { json: true }
    );
    let matchesNeedToRemove = await NhlMatch.find({
      goalServeLeagueId: getMatch?.data?.shedules?.id,
      status: "Not Started",
    }).lean();
    const matchArray = await getMatch?.data?.shedules?.matches;
    const league: any = await League.findOne({
      goalServeLeagueId: getMatch?.data?.shedules?.id,
    });
    for (let i = 0; i < matchArray?.length; i++) {
      for (let j = 0; j < matchArray[i]?.match?.length; j++) {
        matchesNeedToRemove = await removeByAttr(
          matchesNeedToRemove,
          "goalServerMatchId",
          Number(matchArray[i]?.match[j]?.id)
        );
        const match: any = await NhlMatch.findOne({
          goalServeMatchId: matchArray[i]?.match[j]?.id,
        });
        if (!match) {
          const data: Partial<INhlMatchModel> = {
            goalServeLeagueId: league.goalServeLeagueId,
            date: matchArray[i]?.match[j]?.date,
            formattedDate: matchArray[i]?.match[j]?.formatted_date,
            timezone: matchArray[i]?.match[j]?.timezone,
            attendance: matchArray[i]?.match[j]?.attendance,
            goalServeMatchId: matchArray[i]?.match[j]?.id,
            dateTimeUtc: matchArray[i]?.match[j]?.datetime_utc,
            status: matchArray[i]?.match[j]?.status,
            time: matchArray[i]?.match[j]?.time,
            goalServeVenueId: matchArray[i]?.match[j]?.venue_id,
            venueName: matchArray[i]?.match[j]?.venue_name,
            homeTeamTotalScore: matchArray[i]?.match[j]?.hometeam.totalscore
              ? matchArray[i]?.match[j]?.hometeam.totalscore
              : "",
            awayTeamTotalScore: matchArray[i]?.match[j]?.awayteam.totalscore
              ? matchArray[i]?.match[j]?.awayteam.totalscore
              : "",
            // new entries
            timer: matchArray[i]?.match[j]?.timer
              ? matchArray[i]?.match[j]?.timer
              : "",
            isPp: matchArray[i]?.match[j]?.is_pp
              ? matchArray[i]?.match[j]?.is_pp
              : "",
            ppTime: matchArray[i]?.match[j]?.pp_time
              ? matchArray[i]?.match[j]?.pp_time
              : "",
            awayTeamOt: matchArray[i]?.match[j]?.awayteam.ot,
            awayTeamP1: matchArray[i]?.match[j]?.awayteam.p1,
            awayTeamP2: matchArray[i]?.match[j]?.awayteam.p2,
            awayTeamP3: matchArray[i]?.match[j]?.awayteam.p3,
            awayTeamPp: matchArray[i]?.match[j]?.awayteam.pp,
            awayTeamSo: matchArray[i]?.match[j]?.awayteam.so,

            homeTeamOt: matchArray[i]?.match[j]?.hometeam.ot,
            homeTeamP1: matchArray[i]?.match[j]?.hometeam.p1,
            homeTeamP2: matchArray[i]?.match[j]?.hometeam.p2,
            homeTeamP3: matchArray[i]?.match[j]?.hometeam.p3,
            homeTeamPp: matchArray[i]?.match[j]?.hometeam.pp,
            homeTeamSo: matchArray[i]?.match[j]?.hometeam.so,

            scoringFirstperiod: matchArray[i]?.match[j]?.scoring?.firstperiod
              ?.event
              ? matchArray[i]?.match[j]?.scoring?.firstperiod?.event
              : [],
            scoringOvertime: matchArray[i]?.match[j]?.scoring?.overtime?.event
              ? matchArray[i]?.match[j]?.scoring?.overtime?.event
              : [],
            scoringSecondperiod: matchArray[i]?.match[j]?.scoring?.secondperiod
              ?.event
              ? matchArray[i]?.match[j]?.scoring?.secondperiod?.event
              : [],
            scoringShootout: matchArray[i]?.match[j]?.scoring?.shootout?.event
              ? matchArray[i]?.match[j]?.scoring?.shootout?.event
              : [],
            scoringThirdperiod: matchArray[i]?.match[j]?.scoring?.thirdperiod
              ?.event
              ? matchArray[i]?.match[j]?.scoring?.thirdperiod?.event
              : [],

            penaltiesFirstperiod: matchArray[i]?.match[j]?.penalties
              ?.firstperiod?.penalty
              ? matchArray[i]?.match[j]?.penalties?.firstperiod?.penalty
              : [],
            penaltiesOvertime: matchArray[i]?.match[j]?.penalties?.overtime
              ?.penalty
              ? matchArray[i]?.match[j]?.penalties?.overtime?.penalty
              : [],
            penaltiesSecondperiod: matchArray[i]?.match[j]?.penalties
              ?.secondperiod?.penalty
              ? matchArray[i]?.match[j]?.penalties?.secondperiod?.penalty
              : [],
            penaltiesThirdperiod: matchArray[i]?.match[j]?.penalties
              ?.thirdperiod?.penalty
              ? matchArray[i]?.match[j]?.penalties?.thirdperiod?.penalty
              : [],

            teamStatsHomeTeam: matchArray[i]?.match[j]?.team_stats?.hometeam
              ? matchArray[i]?.match[j]?.team_stats?.hometeam
              : {},
            teamStatsAwayTeam: matchArray[i]?.match[j]?.team_stats?.awayteam
              ? matchArray[i]?.match[j]?.team_stats?.awayteam
              : {},

            playerStatsAwayTeam: matchArray[i]?.match[j]?.player_stats?.awayteam
              ?.player
              ? matchArray[i]?.match[j]?.player_stats?.awayteam?.player
              : [],
            playerStatsHomeTeam: matchArray[i]?.match[j]?.player_stats?.hometeam
              ?.player
              ? matchArray[i]?.match[j]?.player_stats?.hometeam?.player
              : [],

            powerPlayAwayTeam: matchArray[i]?.match[j]?.powerplay?.awayteam
              ? matchArray[i]?.match[j]?.powerplay?.awayteam
              : {},
            powerPlayHomeTeam: matchArray[i]?.match[j]?.powerplay?.hometeam
              ? matchArray[i]?.match[j]?.powerplay?.hometeam
              : {},

            goalkeeperStatsAwayTeam: matchArray[i]?.match[j]?.goalkeeper_stats
              ?.awayteam?.player
              ? matchArray[i]?.match[j]?.goalkeeper_stats?.awayteam?.player
              : [],
            goalkeeperStatsHomeTeam: matchArray[i]?.match[j]?.goalkeeper_stats
              ?.hometeam?.player
              ? matchArray[i]?.match[j]?.goalkeeper_stats?.hometeam?.player
              : [],
          };

          const teamIdAway: ITeamNHLModel | null | undefined =
            await TeamNHL.findOne({
              goalServeTeamId: matchArray[i]?.match[j]?.awayteam.id,
            });

          data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 1;

          const teamIdHome: ITeamNHLModel | null | undefined =
            await TeamNHL.findOne({
              goalServeTeamId: matchArray[i]?.match[j]?.hometeam.id,
            });

          data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 1;
          const matchData = new NhlMatch(data);
          await matchData.save();
        }
      }
    }
    for (let k = 0; k < matchesNeedToRemove.length; k++) {
      const match = matchesNeedToRemove[k];
      await NhlMatch.deleteOne({
        goalServeMatchId: match.goalServeMatchId,
      });
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
};

const getUpcommingMatchNhl = async () => {
  try {
    let curruntDay = moment().startOf("day").utc().toISOString();
    let subtractOneDay = moment(curruntDay)
      .subtract(12, "hours")
      .utc()
      .toISOString();
    let addOneDay = moment(curruntDay).add(38, "hours").utc().toISOString();
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
          from: "nhlodds",
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
            goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
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
            homeTeamId: "$homeTeam._id",
            homeTeamErrors: "$homeTeamError",
            won: "$homeTeamStandings.won",
            lose: "$homeTeamStandings.lost",
            teamImage: "$homeTeamImage.image",
            goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
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
    await socketService.socket("nhlUpcomingMatch", {
      getUpcomingMatch,
    });
    return getUpcomingMatch;
  } catch (error: any) {}
};

const getFinalMatchNhl = async () => {
  try {
    let curruntDay = moment().startOf("day").utc().toISOString();
    let subtractOneDay = moment(curruntDay)
      .subtract(12, "hours")
      .utc()
      .toISOString();
    let addOneDay = moment(curruntDay).add(38, "hours").utc().toISOString();
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
            goalServeAwayTeamId: "$awayTeam.goalServeTeamId",
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
          },
          homeTeam: {
            homeTeamName: "$homeTeam.name",
            homeTeamId: "$homeTeam._id",
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
            goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
          },
        },
      },
    ]);
    await socketService.socket("nhlFinalMatch", {
      getFinalMatch,
    });
    return getFinalMatch;
  } catch (error: any) {}
};

const liveBoxscore = async (params: { date1: string }) => {
  const date2 = moment(params.date1).add(48, "hours").utc().toISOString();

  const getMatch = await NhlMatch.aggregate([
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
          $gte: params.date1,
          $lte: date2,
        },
      },
    },
    {
      $lookup: {
        from: "nhlteams",
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
        from: "nhlteamimages",
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
        from: "nhlstandings",
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
        statusWithPeriod: {
          $regexMatch: {
            input: "$status",
            regex: new RegExp("[0-9]"),
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
      $lookup: {
        from: "nhlodds",
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
      $project: {
        id: 1,
        attendance: 1,
        status: {
          $cond: {
            if: {
              $eq: ["$statusWithPeriod", true],
            },
            then: {
              $concat: ["Period ", "", "$status"],
            },
            else: "$status",
          },
        },
        venueName: 1,
        timer: "$timer",
        goalServeMatchId: "$goalServeMatchId",
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
        scoringSummary: [
          { title: "Period 1", child: "$scoringFirstperiod" },
          { title: "Period 2", child: "$scoringSecondperiod" },
          { title: "Period 3", child: "$scoringThirdperiod" },
          { title: "Overtime", child: "$scoringOvertime" },
        ],
        scoring: {
          awayTeam: [
            {
              title: "Period 1",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamP1", "0"] },
                  then: "-",
                  else: "$awayTeamP1",
                },
              },
            },
            {
              title: "Period 2",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamP2", "0"] },
                  then: "-",
                  else: "$awayTeamP2",
                },
              },
            },
            {
              title: "Period 3",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamP3", "0"] },
                  then: "-",
                  else: "$awayTeamP3",
                },
              },
            },
            {
              title: "Overtime",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamOt", "0"] },
                  then: "-",
                  else: "$awayTeamOt",
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
              title: "Period 1",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamP1", "0"] },
                  then: "-",
                  else: "$homeTeamP1",
                },
              },
            },
            {
              title: "Period 2",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamP2", "0"] },
                  then: "-",
                  else: "$homeTeamP2",
                },
              },
            },
            {
              title: "Period 3",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamP3", "0"] },
                  then: "-",
                  else: "$homeTeamP3",
                },
              },
            },
            {
              title: "Overtime",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamOt", "0"] },
                  then: "-",
                  else: "$homeTeamOt",
                },
              },
            },
            {
              title: "Total",
              score: "$homeTeamTotalScore",
            },
          ],
        },
        penaltySummary: [
          { title: "Period 1", child: "$penaltiesFirstperiod" },
          { title: "Period 2", child: "$penaltiesSecondperiod" },
          { title: "Period 3", child: "$penaltiesThirdperiod" },
          { title: "Overtime", child: "$penaltiesOvertime" },
        ],
        goalKeeperReasult: {
          homeTeam: "$goalkeeperStatsHomeTeam",
          awayTeam: "$goalkeeperStatsAwayTeam",
        },

        teamStatistics: [
          {
            title: "Faceoffs won",
            homeTeam: "$teamStatsHomeTeam.faceoffs_won.total",
            awayTeam: "$teamStatsAwayTeam.faceoffs_won.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.faceoffs_won.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.faceoffs_won.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                ],
              },
            },
          },
          {
            title: "Penalties",
            homeTeam: "$teamStatsHomeTeam.penalty_minutes.total",
            awayTeam: "$teamStatsAwayTeam.penalty_minutes.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.penalty_minutes.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.penalty_minutes.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                ],
              },
            },
          },
          {
            title: "Hits",
            homeTeam: "$teamStatsHomeTeam.hits.total",
            awayTeam: "$teamStatsAwayTeam.hits.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.hits.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.hits.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                ],
              },
            },
          },
          {
            title: "Shots",
            awayTeam: "$teamStatsAwayTeam.shots.total",
            homeTeam: "$teamStatsHomeTeam.shots.total",
            total: {
              $toInt: {
                $sum: [
                  {
                    $convert: {
                      input: "$teamStatsHomeTeam.shots.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                  {
                    $convert: {
                      input: "$teamStatsAwayTeam.shots.total",
                      to: "int",
                      onError: 0,
                    },
                  },
                ],
              },
            },
          },
        ],
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
  await socketService.socket("nhlLiveBoxscore", {
    getMatch,
  });
  return getLiveDataOfNhl;
};
export default {
  addNhlMatch,
  getNHLStandingData,
  nhlSingleGameBoxScore,
  addMatchDataFutureForNhl,
  nhlScoreWithDate,
  nhlScoreWithCurrentDate,
  getLiveDataOfNhl,
  nhlGetTeam,
  nhlSingleGameBoxScoreUpcomming,
  updateCurruntDateRecordNhl,
  nhlSingleGameBoxScoreLive,
  updateStandingNhl,
  updatePlayersNhl,
  updateInjuredPlayerNHL,
  createAndUpdateOddsNhl,
  updateNhlMatch,
  getUpcommingMatchNhl,
  getFinalMatchNhl,
  liveBoxscore,
};
