import NflMatch from "../../models/documents/NFL/match.model";
import NflStandings from "../../models/documents/NFL/standings.model";
import StatsTeamNFL from "../../models/documents/NFL/teamStats.model";
import League from "../../models/documents/league.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import INflMatchModel from "../../models/interfaces/nflMatch.interface";
import { axiosGet } from "../../services/axios.service";
import PlayersNFL from "../../models/documents/NFL/player.model";
import { INflPlayerModel } from "../../models/interfaces/nflPlayer.interface";
import INFLStatsTeamModel from "../../models/interfaces/nflStats.interface";
import { goalserveApi } from "../../services/goalserve.service";
import TeamNFL from "../../models/documents/NFL/team.model";
import NflInjury from "../../models/documents/NFL/injury.model";
import moment from "moment";
import NflOdds from "../../models/documents/NFL/odds.model";
import { isArray } from "lodash";
import NFLMatchStatsTeam from "../../models/documents/NFL/matchTeamStats";
import Bet from "../../models/documents/bet.model";
import { betStatus } from "../../models/interfaces/bet.interface";

async function declareResultMatch(
  matchId: number,
  winTeamId: number,
  leagueType: string
) {
  await Bet.updateMany(
    {
      goalServeMatchId: Number(matchId),
      status: betStatus.ACTIVE,
      leagueType: leagueType,
    },
    {
      status: betStatus.RESULT_DECLARED,
      goalServeWinTeamId: winTeamId,
      resultAt: new Date(),
    }
  );
}

const getOdds = (nameKey: any, myArray: any) => {
  for (let i = 0; i < myArray?.length; i++) {
    if (myArray[i].value == nameKey) {
      if (isArray(myArray[i]?.bookmaker) == true) {
        return myArray[i].bookmaker[0];
      } else {
        return myArray[i].bookmaker;
      }
    }
  }
};
const getTotal = (nameKey: any, myArray: any) => {
  if (myArray?.length > 0) {
    for (let i = 0; i < myArray?.length; i++) {
      if (myArray[i]?.value == nameKey) {
        if (isArray(myArray[i]?.bookmaker) == true) {
          return myArray[i]?.bookmaker[0];
        } else {
          return myArray[i]?.bookmaker;
        }
      }
    }
  }
};

const getTotalValues = async (total: any) => {
  if (total) {
    if (isArray(total?.total)) {
      return total?.total[0]?.name ? total?.total[0]?.name : "";
    } else {
      return total?.total?.name ? total?.total?.name : "";
    }
  } else {
    return "";
  }
};

async function mergeByPlayerId(...arrays: any[][]): Promise<any[]> {
  const merged: { [key: number]: any } = {};

  arrays.forEach((arr) => {
    arr.forEach((obj) => {
      const { goalServePlayerId, ...rest } = obj;
      if (!merged[goalServePlayerId]) {
        merged[goalServePlayerId] = {};
      }
      Object.assign(merged[goalServePlayerId], rest);
    });
  });

  return Object.entries(merged).map(([goalServePlayerId, values]) => ({
    goalServePlayerId: goalServePlayerId,
    ...values,
  }));
}
export default class NFLDbCronServiceClass {
  public addNbaStandings = async () => {
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
                  ties: team.ties ? Number(team.ties) : 0,
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

  public updateNflMatch = async () => {
    try {
      const getMatch = await axiosGet(
        `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/nfl-shedule`,
        { json: true }
      );
      const matchArray = await getMatch?.data?.shedules?.tournament;
      const league: ILeagueModel | null = await League.findOne({
        goalServeLeagueId: getMatch?.data?.shedules?.id,
      });
      for (let i = 0; i < matchArray?.length; i++) {
        for (let j = 0; j < matchArray[i]?.week?.length; j++) {
          if (matchArray[i]?.week[j]?.matches.length > 0) {
            for (let k = 0; k < matchArray[i]?.week[j].matches.length; k++) {
              for (
                let l = 0;
                l < matchArray[i]?.week[j].matches[k].match.length;
                l++
              ) {
                const match: INflMatchModel | null = await NflMatch.findOne({
                  goalServeMatchId:
                    matchArray[i]?.week[j]?.matches[k]?.match[l]?.contestID,
                });
                if (!match) {
                  const data: Partial<INflMatchModel> = {
                    goalServeLeagueId: league?.goalServeLeagueId,
                    goalServeMatchId:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.contestID,
                    attendance:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.attendance,
                    goalServeHomeTeamId:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.id,
                    goalServeAwayTeamId:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.id,

                    date: matchArray[i]?.week[j]?.matches[k]?.date,
                    dateTimeUtc:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]
                        ?.datetime_utc,
                    formattedDate:
                      matchArray[i]?.week[j]?.matches[k]?.formatted_date,
                    status:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.status,
                    time: matchArray[i]?.week[j]?.matches[k]?.match[l]?.time,
                    timezone: matchArray[i]?.week[j]?.matches[k]?.timezone,
                    goalServeVenueId:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.venue_id,
                    venueName:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.venue,
                    homeTeamTotalScore:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam
                        .totalscore,
                    awayTeamTotalScore:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam
                        .totalscore,

                    // new entries
                    weekName: matchArray[i]?.week[j]?.name,
                    seasonName: matchArray[i]?.name,

                    // timer: matchArray[i]?.match[j]?.timer
                    //   ? matchArray[i]?.match[j]?.timer
                    //   : "",
                    awayTeamOt:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.ot,
                    awayTeamQ1:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.q1,
                    awayTeamQ2:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.q2,
                    awayTeamQ3:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.q3,
                    awayTeamQ4:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam.q4,
                    awayTeamBallOn:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam
                        .ball_on,
                    awayTeamDrive:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam
                        .drive,
                    awayTeamNumber:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam
                        .number,

                    homeTeamOt:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.ot,
                    homeTeamQ1:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.q1,
                    homeTeamQ2:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.q2,
                    homeTeamQ3:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.q3,
                    homeTeamQ4:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam.q4,
                    homeTeamBallOn: matchArray[i]?.week[j]?.matches[k]?.match[l]
                      ?.awayteam.ball_on
                      ? matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam
                          .ball_on
                      : "",
                    homeTeamDrive: matchArray[i]?.week[j]?.matches[k]?.match[l]
                      ?.hometeam.drive
                      ? matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam
                          .drive
                      : "",
                    homeTeamNumber: matchArray[i]?.week[j]?.matches[k]?.match[l]
                      ?.hometeam.number
                      ? matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam
                          .number
                      : "",
                  };
                  const matchData = new NflMatch(data);
                  await matchData.save();
                }
              }
              continue;
              // return;
            }
            continue;
          } else {
            for (
              let m = 0;
              m < matchArray[i]?.week[j].matches?.match.length;
              m++
            ) {
              const match: INflMatchModel | null = await NflMatch.findOne({
                goalServeMatchId:
                  matchArray[i]?.week[j]?.matches?.match[m]?.contestID,
              });
              if (!match) {
                const data: Partial<INflMatchModel> = {
                  goalServeLeagueId: league?.goalServeLeagueId,
                  goalServeMatchId:
                    matchArray[i]?.week[j]?.matches?.match[m]?.contestID,
                  attendance:
                    matchArray[i]?.week[j]?.matches?.match[m]?.attendance,
                  goalServeHomeTeamId:
                    matchArray[i]?.week[j]?.matches?.match[m]?.hometeam.id,
                  goalServeAwayTeamId:
                    matchArray[i]?.week[j]?.matches?.match[m]?.awayteam.id,

                  date: matchArray[i]?.week[j]?.matches?.date,
                  dateTimeUtc:
                    matchArray[i]?.week[j]?.matches?.match[m]?.datetime_utc,
                  formattedDate:
                    matchArray[i]?.week[j]?.matches?.formatted_date,
                  status: matchArray[i]?.week[j]?.matches?.match[m]?.status,
                  time: matchArray[i]?.week[j]?.matches?.match[m]?.time,
                  timezone: matchArray[i]?.week[j]?.matches?.timezone,
                  goalServeVenueId:
                    matchArray[i]?.week[j]?.matches?.match[m]?.venue_id,
                  venueName: matchArray[i]?.week[j]?.matches?.match[m]?.venue,
                  homeTeamTotalScore:
                    matchArray[i]?.week[j]?.matches?.match[m]?.hometeam
                      .totalscore,
                  awayTeamTotalScore:
                    matchArray[i]?.week[j]?.matches?.match[m]?.awayteam
                      .totalscore,

                  // new entries
                  weekName: matchArray[i]?.week[j]?.name,
                  seasonName: matchArray[i]?.name,

                  // timer: matchArray[i]?.match[j]?.timer
                  //   ? matchArray[i]?.match[j]?.timer
                  //   : "",
                  awayTeamOt:
                    matchArray[i]?.week[j]?.matches?.match[m]?.awayteam.ot,
                  awayTeamQ1:
                    matchArray[i]?.week[j]?.matches?.match[m]?.awayteam.q1,
                  awayTeamQ2:
                    matchArray[i]?.week[j]?.matches?.match[m]?.awayteam.q2,
                  awayTeamQ3:
                    matchArray[i]?.week[j]?.matches?.match[m]?.awayteam.q3,
                  awayTeamQ4:
                    matchArray[i]?.week[j]?.matches?.match[m]?.awayteam.q4,
                  awayTeamBallOn:
                    matchArray[i]?.week[j]?.matches?.match[m]?.awayteam.ball_on,
                  awayTeamDrive:
                    matchArray[i]?.week[j]?.matches?.match[m]?.awayteam.drive,
                  awayTeamNumber:
                    matchArray[i]?.week[j]?.matches?.match[m]?.awayteam.number,

                  homeTeamOt:
                    matchArray[i]?.week[j]?.matches?.match[m]?.hometeam.ot,
                  homeTeamQ1:
                    matchArray[i]?.week[j]?.matches?.match[m]?.hometeam.q1,
                  homeTeamQ2:
                    matchArray[i]?.week[j]?.matches?.match[m]?.hometeam.q2,
                  homeTeamQ3:
                    matchArray[i]?.week[j]?.matches?.match[m]?.hometeam.q3,
                  homeTeamQ4:
                    matchArray[i]?.week[j]?.matches?.match[m]?.hometeam.q4,
                  homeTeamBallOn: matchArray[i]?.week[j]?.matches?.match[m]
                    ?.awayteam.ball_on
                    ? matchArray[i]?.week[j]?.matches?.match[m]?.awayteam
                        .ball_on
                    : "",
                  homeTeamDrive: matchArray[i]?.week[j]?.matches?.match[m]
                    ?.hometeam.drive
                    ? matchArray[i]?.week[j]?.matches?.match[m]?.hometeam.drive
                    : "",
                  homeTeamNumber: matchArray[i]?.week[j]?.matches?.match[m]
                    ?.hometeam.number
                    ? matchArray[i]?.week[j]?.matches?.match[m]?.hometeam.number
                    : "",
                };
                const matchData = new NflMatch(data);
                await matchData.save();
              }
            }
            continue;
          }
        }
        continue;
        //   for (let k = 0; k < matchesNeedToRemove.length; k++) {
        //     const match = matchesNeedToRemove[k];
        //     await NbaMatch.deleteOne({
        //       goalServeMatchId: match.goalServeMatchId,
        //     });

        return true;
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };

  public addPlayers = async () => {
    const teams = await TeamNFL.find();
    let data = {
      json: true,
    };
    if (teams.length > 0) {
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];

        const roasterApi = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          data,
          `football/${team.goalServeTeamId}_rosters`
        );

        let allRosterPlayers: Partial<INflPlayerModel>[] = [];
        let position = roasterApi?.data?.team?.position;
        for (let p = 0; p < position.length; p++) {
          if (position[p]?.player) {
            let players: any = position[p].player;

            if (players?.length) {
              for (let j = 0; j < players.length; j++) {
                const player: any = players[j];
                const PlayerData = {
                  age: player.age,
                  college: player.college,
                  height: player.height,
                  number: player.number,
                  position: player.position,
                  salarycap: player.salarycap,
                  weight: player.weight,
                  teamId: team.id,
                  experience_years: player.experience_years,
                  goalServeTeamId: team.goalServeTeamId,
                  goalServePlayerId: player.id,
                };
                allRosterPlayers.push(PlayerData);
              }
            } else {
              allRosterPlayers.push({
                age: players.age,
                college: players.college,
                height: players.height,
                name: players.name,
                number: players.number,
                position: players.position,
                salarycap: players.salarycap,
                weight: players.weight,
                experience_years: players.experience_years,
                goalServeTeamId: team.goalServeTeamId,
                goalServePlayerId: players.id,
              });
            }
          }
        }
        const statsApi = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          data,
          `football/${team.goalServeTeamId}_player_stats`
        );
        const allPassingPlayer = [];
        const allRushingPlayer = [];
        const allReceivingPlayer = [];
        const allDefencePlayer = [];
        const allScoringPlayer = [];
        const allReturningPlayer = [];
        const allPuntingPlayer = [];
        const allKickingPlayer = [];
        if (statsApi?.data?.statistic?.category.length) {
          const categories = statsApi.data.statistic.category;
          for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            const categoryName = categories[i].name;
            if (category.player.length) {
              const players = category.player;
              for (let j = 0; j < players.length; j++) {
                const player = players[j];
                const playerData: any = {
                  teamId: team.id,
                  goalServeTeamId: team.goalServeTeamId,
                  goalServePlayerId: player.id,
                };
                switch (categoryName) {
                  case "Passing":
                    playerData.name = player.name;
                    playerData.isPassingPlayer = true;
                    playerData.passing = { ...player };
                    allPassingPlayer.push(playerData);
                    break;
                  case "Rushing":
                    playerData.name = player.name;
                    playerData.isRushingPlayer = true;
                    playerData.rushing = { ...player };
                    allRushingPlayer.push(playerData);
                    break;
                  case "Receiving":
                    playerData.name = player.name;
                    playerData.isReceivingPlayer = true;
                    playerData.receiving = { ...player };
                    allReceivingPlayer.push(playerData);
                    break;
                  case "Defense":
                    playerData.name = player.name;
                    playerData.isDefensePlayer = true;
                    playerData.defence = { ...player };
                    allDefencePlayer.push(playerData);
                    break;
                  case "Scoring":
                    playerData.name = player.name;
                    playerData.isScoringPlayer = true;
                    playerData.scoring = { ...player };
                    allScoringPlayer.push(playerData);
                    break;
                  case "Returning":
                    playerData.name = player.name;
                    playerData.isReturningPlayer = true;
                    playerData.returning = { ...player };
                    allReturningPlayer.push(playerData);
                    break;
                  case "Kicking":
                    playerData.name = player.name;
                    playerData.isKickingPlayer = true;
                    playerData.kicking = { ...player };
                    allKickingPlayer.push(playerData);
                    break;
                  case "Punting":
                    playerData.name = player.name;
                    playerData.isPuntingPlayer = true;
                    playerData.punting = { ...player };
                    allPuntingPlayer.push(playerData);
                    break;

                  default:
                    break;
                }
              }
            }
          }
        }
        const mergedArray: INflPlayerModel[] | null = await mergeByPlayerId(
          allRosterPlayers,
          allPassingPlayer,
          allRushingPlayer,
          allPuntingPlayer,
          allKickingPlayer,
          allReturningPlayer,
          allScoringPlayer,
          allDefencePlayer,
          allReceivingPlayer
        );
        for (let k = 0; k < mergedArray?.length; k++) {
          const player = mergedArray[k];
          await PlayersNFL.updateOne(
            {
              goalServeTeamId: player.goalServeTeamId,
              goalServePlayerId: player.goalServePlayerId,
            },
            { $set: player },
            { upsert: true }
          );
        }
      }
    }
  };

  public addTeamStats = async () => {
    const teams = await TeamNFL.find();
    let data = {
      json: true,
    };
    if (teams.length > 0) {
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        const teamstats = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          data,
          `football/${team.goalServeTeamId}_team_stats`
        );
        let stats: Partial<INFLStatsTeamModel> = {};
        let category = teamstats?.data?.statistic?.category;
        for (let j = 0; j < category.length; j++) {
          let categoryName = category[j].name;
          switch (categoryName) {
            case "Passing":
              stats.passingOpponent = category[j].opponents;
              stats.passingTeam = category[j].team;
              break;
            case "Rushing":
              stats.rushingOpponent = category[j].opponents;
              stats.rushingTeam = category[j].team;
              break;
            case "Downs":
              stats.downsOpponent = category[j].opponents;
              stats.downsTeam = category[j].team;
              break;
            case "Returning":
              stats.returningOpponent = category[j].opponents;
              stats.returningTeam = category[j].team;
              break;
            case "Kicking":
              stats.kickingOpponent = category[j].opponents;
              stats.kickingTeam = category[j].team;

              break;

            default:
              break;
          }
        }
        await StatsTeamNFL.updateOne(
          {
            teamId: team.id,
            goalServeTeamId: teamstats?.data?.statistic.id,
          },
          { $set: stats },
          { upsert: true }
        );
      }
    }
  };

  public updateLiveMatch = async () => {
    try {
      const getMatch: any = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/nfl-scores`,
        { json: true }
      );
      const matchArrayAll = Array.isArray(
        getMatch?.data?.scores?.category?.match
      )
        ? getMatch?.data?.scores?.category?.match
        : [getMatch?.data?.scores?.category?.match];
      if (!matchArrayAll || matchArrayAll?.length === 0) {
        console.log("No matches to update.");
        return;
      }

      const matchArray = matchArrayAll.filter((element: any) => {
        return (
          element.status !== "Not Started" &&
          element.status !== "Final" &&
          // element.status !== "Delayed" &&
          // element.status !== "Suspended" &&
          // element.status !== "Canceled" &&
          // element.status !== "Postponed" &&
          element.status !== "After Over Time" &&
          element.status !== "Final/OT" &&
          element.status !== "Final/20T"
        );
      });
      // console.log("matchArray", matchArray);

      const updatePromises = matchArray?.map(async (match: any) => {
        console.log("LIVE NFLmatch.id", match?.contestID);

        const data: Partial<INflMatchModel> = {
          attendance: match?.attendance,
          goalServeHomeTeamId: match?.hometeam.id,
          goalServeAwayTeamId: match?.awayteam.id,

          date: match?.date,
          dateTimeUtc: match?.datetime_utc,
          formattedDate: match?.formatted_date,
          status: match?.status,
          time: match?.time,
          timezone: match?.timezone,
          goalServeVenueId: match?.venue_id,
          venueName: match?.venue,
          homeTeamTotalScore: match?.hometeam.totalscore,
          awayTeamTotalScore: match?.awayteam.totalscore,

          timer: match?.timer ? match?.timer : "",
          awayTeamOt: match?.awayteam.ot ? match?.awayteam.ot : "",
          awayTeamQ1: match?.awayteam.q1 ? match?.awayteam.q1 : "",
          awayTeamQ2: match?.awayteam.q2 ? match?.awayteam.q2 : "",
          awayTeamQ3: match?.awayteam.q3 ? match?.awayteam.q3 : "",
          awayTeamQ4: match?.awayteam.q4 ? match?.awayteam.q4 : "",
          awayTeamBallOn: match?.awayteam.ball_on
            ? match?.awayteam.ball_on
            : "",
          awayTeamDrive: match?.awayteam.drive ? match?.awayteam.drive : "",
          awayTeamNumber: match?.awayteam.number ? match?.awayteam.number : "",

          homeTeamOt: match?.hometeam.ot ? match?.hometeam.ot : "",
          homeTeamQ1: match?.hometeam.q1 ? match?.hometeam.q1 : "",
          homeTeamQ2: match?.hometeam.q2 ? match?.hometeam.q2 : "",
          homeTeamQ3: match?.hometeam.q3 ? match?.hometeam.q3 : "",
          homeTeamQ4: match?.hometeam.q4 ? match?.hometeam.q4 : "",
          homeTeamBallOn: match?.awayteam.ball_on
            ? match?.awayteam.ball_on
            : "",
          homeTeamDrive: match?.hometeam.drive ? match?.hometeam.drive : "",
          homeTeamNumber: match?.hometeam.number ? match?.hometeam.number : "",
        };
        const dataUpdate = await NflMatch.findOneAndUpdate(
          { goalServeMatchId: match?.contestID },
          { $set: data },
          { new: true }
        );
        console.log("LIVE NFLdataUpdate==>", dataUpdate?.goalServeMatchId);

        if (
          match?.status != "Not Started" &&
          match?.status != "Final" &&
          match?.status != "Postponed" &&
          match?.status != "Canceled" &&
          match?.status != "Suspended"
        ) {
          const goalServeMatchId = match?.contestID;
          // expire not accepted bet requests
          await Bet.updateMany(
            {
              status: "PENDING",
              goalServeMatchId: Number(goalServeMatchId),
              leagueType: "NFL",
            },
            {
              status: "EXPIRED",
            }
          );
          // active  CONFIRMED bet when match start
          await Bet.updateMany(
            {
              status: "CONFIRMED",
              goalServeMatchId: Number(goalServeMatchId),
              leagueType: "NFL",
            },
            {
              status: "ACTIVE",
            }
          );
        } else if (
          match.status == "Cancelled" ||
          match.status == "Postponed" ||
          match.status == "Suspended"
        ) {
          const goalServeMatchId = match.contestID;
          await Bet.updateMany(
            {
              status: "PENDING",
              goalServeMatchId: Number(goalServeMatchId),
              leagueType: "NFL",
            },
            {
              status: "EXPIRED",
            }
          );
          await Bet.updateMany(
            {
              status: { $in: ["CONFIRMED", "ACTIVE"] },
              goalServeMatchId: Number(goalServeMatchId),
              leagueType: "NFL",
            },
            {
              status: "CANCELED",
            }
          );
        }
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.log("error", error);
    }
  };

  public updateLiveMatchFinal = async () => {
    try {
      const getMatch: any = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/nfl-scores`,
        { json: true }
      );
      const matchArrayAll = Array.isArray(
        getMatch?.data?.scores?.category?.match
      )
        ? getMatch?.data?.scores?.category?.match
        : [getMatch?.data?.scores?.category?.match];

      if (!matchArrayAll || matchArrayAll?.length === 0) {
        console.log("No matches to update.");
        return;
      }
      const matchArray = matchArrayAll?.filter((element: any) => {
        return (
          element.status === "Final" ||
          element.status === "After Over Time" ||
          element.status === "Final/OT" ||
          element.status === "Final/20T"
        );
      });

      const updatePromises = matchArray?.map(async (match: any) => {
        const findMatch = await NflMatch.findOne({
          goalServeMatchId: match.contestID,
          $or: [
            { status: "After Over Time" },
            { status: "Final" },
            { status: "Final/OT" },
            { status: "Final/20T" },
          ],
        }).lean();
        if (!findMatch) {
          const data: Partial<INflMatchModel> = {
            attendance: match?.attendance,
            goalServeHomeTeamId: match?.hometeam.id,
            goalServeAwayTeamId: match?.awayteam.id,

            date: match?.date,
            dateTimeUtc: match?.datetime_utc,
            formattedDate: match?.formatted_date,
            status: match?.status,
            time: match?.time,
            timezone: match?.timezone,
            goalServeVenueId: match?.venue_id,
            venueName: match?.venue,
            homeTeamTotalScore: match?.hometeam.totalscore,
            awayTeamTotalScore: match?.awayteam.totalscore,

            timer: match?.timer ? match?.timer : "",
            awayTeamOt: match?.awayteam.ot ? match?.awayteam.ot : "",
            awayTeamQ1: match?.awayteam.q1 ? match?.awayteam.q1 : "",
            awayTeamQ2: match?.awayteam.q2 ? match?.awayteam.q2 : "",
            awayTeamQ3: match?.awayteam.q3 ? match?.awayteam.q3 : "",
            awayTeamQ4: match?.awayteam.q4 ? match?.awayteam.q4 : "",
            awayTeamBallOn: match?.awayteam.ball_on
              ? match?.awayteam.ball_on
              : "",
            awayTeamDrive: match?.awayteam.drive ? match?.awayteam.drive : "",
            awayTeamNumber: match?.awayteam.number
              ? match?.awayteam.number
              : "",

            homeTeamOt: match?.hometeam.ot ? match?.hometeam.ot : "",
            homeTeamQ1: match?.hometeam.q1 ? match?.hometeam.q1 : "",
            homeTeamQ2: match?.hometeam.q2 ? match?.hometeam.q2 : "",
            homeTeamQ3: match?.hometeam.q3 ? match?.hometeam.q3 : "",
            homeTeamQ4: match?.hometeam.q4 ? match?.hometeam.q4 : "",
            homeTeamBallOn: match?.awayteam.ball_on
              ? match?.awayteam.ball_on
              : "",
            homeTeamDrive: match?.hometeam.drive ? match?.hometeam.drive : "",
            homeTeamNumber: match?.hometeam.number
              ? match?.hometeam.number
              : "",
          };
          const dataUpdate = await NflMatch.findOneAndUpdate(
            { goalServeMatchId: match?.contestID },
            { $set: data },
            { new: true }
          );

          // if (match?.status == "Final" || match?.status == "After Over Time") {
          const homeTeamTotalScore = parseFloat(match?.hometeam.totalscore);
          const awayTeamTotalScore = parseFloat(match?.awayteam.totalscore);
          const goalServeMatchId = match?.contestID;
          const goalServeWinTeamId =
            homeTeamTotalScore > awayTeamTotalScore
              ? match?.hometeam.id
              : match?.awayteam.id;
          await declareResultMatch(
            Number(goalServeMatchId),
            Number(goalServeWinTeamId),
            "NFL"
          );
          // }
        }
      });
      await Promise.all(updatePromises);
    } catch (error) {
      console.log("error", error);
    }
  };
  public addInjuredPlayer = async () => {
    const team = await TeamNFL.find();
    await Promise.all(
      team.map(async (item) => {
        let data = {
          json: true,
        };
        const injuryApi = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          data,
          `football//${item?.goalServeTeamId}_injuries`
        );
        const injuryArray1 = injuryApi?.data?.team;
        const existingPlayers = await NflInjury.find({
          goalServeTeamId: item?.goalServeTeamId,
        });
        if (injuryArray1?.report && injuryArray1?.report?.length > 0) {
          // Find the extra entries in the existingPlayers array
          const extraEntries = existingPlayers.filter((player) => {
            const playerExists = injuryArray1?.report?.some(
              (val: any) => val?.player_id === player.goalServePlayerId
            );
            return !playerExists;
          });
          await NflInjury.deleteMany({
            _id: { $in: extraEntries.map((player) => player._id) },
          });

          await Promise.all(
            injuryArray1?.report?.map(async (val: any) => {
              const player = await PlayersNFL.findOne({
                goalServePlayerId: val?.player_id,
              }).lean();

              const data = {
                date: val?.date,
                description: val?.description,
                goalServePlayerId: val?.player_id,
                playerName: val?.player_name,
                playerId: player?.id,
                status: val?.status,
                goalServeTeamId: injuryApi?.data?.team?.id,
                teamId: item?._id,
              };
              await NflInjury.updateOne(
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
          await NflInjury.deleteMany({
            _id: { $in: extraEntries.map((player) => player._id) },
          });
          const val = injuryArray1?.report;
          const player = await PlayersNFL.findOne({
            goalServePlayerId: val?.player_id,
          }).lean();

          const data = {
            date: val?.date,
            description: val?.description,
            goalServePlayerId: val?.player_id,
            playerName: val?.player_name,
            status: val?.status,
            goalServeTeamId: injuryArray1?.id,
            teamId: item?.id,
            playerId: player?._id,
          };
          await NflInjury.updateOne(
            {
              goalServeTeamId: data?.goalServeTeamId,
              goalServePlayerId: data?.goalServePlayerId,
            },
            { $set: data },
            { upsert: true }
          );
        } else {
          await NflInjury.deleteMany({
            _id: { $in: existingPlayers.map((player) => player._id) },
          });
        }
      })
    );
  };
  public addMatchTeamStats = async () => {
    try {
      const getMatch: any = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/nfl-scores`,
        { json: true }
      );

      const matchArray = await getMatch?.data?.scores?.category?.match;
      const league: ILeagueModel | undefined | null = await League.findOne({
        goalServeLeagueId: getMatch?.data?.scores?.category?.id,
      });

      if (matchArray?.length > 0 && matchArray) {
        for (let i = 0; i < matchArray?.length; i++) {
          const data = {
            attendance: matchArray[i]?.attendance,
            goalServeHomeTeamId: matchArray[i]?.hometeam.id,
            goalServeAwayTeamId: matchArray[i]?.awayteam.id,
            goalServeMatchId: matchArray[i]?.contestID,
            date: matchArray[i]?.date,
            dateTimeUtc: matchArray[i]?.datetime_utc,
            formattedDate: matchArray[i]?.formatted_date,
            status: matchArray[i]?.status,
            time: matchArray[i]?.time,
            timezone: matchArray[i]?.timezone,
            team_stats: matchArray[i].team_stats,
          };
          await NFLMatchStatsTeam.updateOne(
            { goalServeMatchId: matchArray[i]?.contestID },
            { $set: data },
            { upsert: true }
          );
        }
      } else {
        if (matchArray) {
          const data = {
            goalServeHomeTeamId: matchArray?.hometeam.id,
            goalServeAwayTeamId: matchArray?.awayteam.id,
            date: matchArray?.date,
            goalServeMatchId: matchArray?.contestID,
            dateTimeUtc: matchArray?.datetime_utc,
            formattedDate: matchArray?.formatted_date,
            status: matchArray?.status,
            time: matchArray?.time,
            timezone: matchArray?.timezone,
            team_stats: matchArray?.team_stats,
          };
          await NFLMatchStatsTeam.updateOne(
            { goalServeMatchId: matchArray?.contestID },
            { $set: data },
            { upsert: true }
          );
        }
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  public addOrUpdateDriveInLive = async () => {
    try {
      const getMatch: any = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/nfl-playbyplay-scores`,
        { json: true }
      );
      // const matchArray = await getMatch?.data?.scores?.category?.match;
      const matchArrayAll = Array.isArray(
        getMatch?.data?.scores?.category?.match
      )
        ? getMatch?.data?.scores?.category?.match
        : [getMatch?.data?.scores?.category?.match];
      if (!matchArrayAll || matchArrayAll?.length === 0) {
        console.log("No matches to update.");
        return;
      }

      const matchArray = matchArrayAll.filter((element: any) => {
        return (
          element.status !== "Not Started" &&
          element.status !== "Final" &&
          // element.status !== "Delayed" &&
          // element.status !== "Suspended" &&
          // element.status !== "Canceled" &&
          // element.status !== "Postponed" &&
          element.status !== "After Over Time" &&
          element.status !== "Final/OT" &&
          element.status !== "Final/20T"
        );
      });
      // if (matchArray?.length > 0 && matchArray) {
        const updatePromises = matchArray?.map(async (match: any) => {
          const data: any = {
            drive: match.playbyplay.drive[0].play[0].down
              ? match.playbyplay.drive[0].play[0].down
              : "",
          };

          const dataUpdate = await NflMatch.findOneAndUpdate(
                  { goalServeMatchId: match?.contestID },
                  { $set: data },
                  { new: true }
                );
        })
      await Promise.all(updatePromises);

        // for (let i = 0; i < matchArray?.length; i++) {
        //   const match: INflMatchModel | null = await NflMatch.findOne({
        //     goalServeMatchId: matchArray[i]?.contestID,
        //   });
        //   if (match) {
        //     const data: any = {
        //       drive: matchArray[i].playbyplay.drive[0].play[0].down
        //         ? matchArray[i].playbyplay.drive[0].play[0].down
        //         : "",
        //     };
        //     const dataUpdate = await NflMatch.findOneAndUpdate(
        //       { goalServeMatchId: matchArray[i]?.contestID },
        //       { $set: data },
        //       { new: true }
        //     );
        //   }
        // }
      
    } catch (error: any) {}
  };

  public createOdds = async () => {
    let subDate = moment()
      .startOf("day")
      .subtract(24, "hours")
      .utc()
      .toISOString();
    let addDate = moment().add(1, "weeks").utc().toISOString();
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
        showodds: "1",
        bm: "451,455,",
        date1: date1,
        date2: date2,
      };
      const getMatch = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        "football/nfl-shedule"
      );
      const matchArray = await getMatch?.data?.shedules?.tournament;
      const league: ILeagueModel | null = await League.findOne({
        goalServeLeagueId: getMatch?.data?.shedules?.id,
      });
      for (let i = 0; i < matchArray?.length; i++) {
        for (let j = 0; j < matchArray[i]?.week?.length; j++) {
          if (matchArray[i]?.week[j]?.matches?.length > 0) {
            for (let k = 0; k < matchArray[i]?.week[j].matches.length; k++) {
              for (
                let l = 0;
                l < matchArray[i]?.week[j].matches[k].match.length;
                l++
              ) {
                const findOdd = await NflOdds.find({
                  goalServeMatchId:
                    matchArray[i]?.week[j]?.matches[k]?.match[l]?.contestID,
                });
                const findMatch = await NflMatch.findOne({
                  goalServeMatchId:
                    matchArray[i]?.week[j]?.matches[k]?.match[l]?.contestID,
                });
                const getMoneyLine: any = await getOdds(
                  "Home/Away",
                  matchArray[i]?.week[j]?.matches[k]?.match[l]?.odds?.type
                );
                const awayTeamMoneyline = getMoneyLine
                  ? getMoneyLine?.odd?.find((item: any) => item?.name === "2")
                  : undefined;
                const homeTeamMoneyline = getMoneyLine
                  ? getMoneyLine?.odd?.find((item: any) => item?.name === "1")
                  : undefined;
                // getSpread
                const getSpread = await getOdds(
                  "Handicap",
                  matchArray[i]?.week[j]?.matches[k]?.match[l]?.odds?.type
                );

                const getAwayTeamRunLine = (await getSpread)
                  ? getSpread?.handicap?.odd?.find(
                      (item: any) => item?.name === "2"
                    )
                  : {};
                const getHomeTeamRunLine = (await getSpread)
                  ? getSpread?.handicap?.odd?.find(
                      (item: any) => item?.name === "1"
                    )
                  : {};
                const total = await getTotal(
                  "Over/Under",
                  matchArray[i]?.week[j]?.matches[k]?.match[l]?.odds?.type
                );
                const totalValues = await getTotalValues(total);

                const data = {
                  status: matchArray[i]?.week[j]?.matches[k]?.match[l]?.status,
                  goalServerLeagueId: league?.goalServeLeagueId,
                  goalServeMatchId:
                    matchArray[i]?.week[j]?.matches[k]?.match[l]?.contestID,
                  goalServeHomeTeamId:
                    matchArray[i]?.week[j]?.matches[k]?.match[l]?.hometeam?.id,
                  goalServeAwayTeamId:
                    matchArray[i]?.week[j]?.matches[k]?.match[l]?.awayteam?.id,
                  // homeTeamSpread: homeTeamSpread,
                  ...(getHomeTeamRunLine && {
                    homeTeamSpread: getHomeTeamRunLine,
                  }),
                  ...(getHomeTeamRunLine?.us && {
                    homeTeamSpreadUs: getHomeTeamRunLine?.us,
                  }),
                  // homeTeamTotal: totalValues,
                  ...(totalValues && { homeTeamTotal: totalValues }),
                  // awayTeamSpread: awayTeamSpread,
                  ...(getAwayTeamRunLine && {
                    awayTeamSpread: getAwayTeamRunLine,
                  }),
                  ...(getAwayTeamRunLine?.us && {
                    awayTeamSpreadUs: getAwayTeamRunLine?.us,
                  }),
                  // awayTeamTotal: totalValues,
                  ...(totalValues && { awayTeamTotal: totalValues }),
                  ...(awayTeamMoneyline && {
                    awayTeamMoneyline: awayTeamMoneyline,
                  }),
                  ...(homeTeamMoneyline && {
                    homeTeamMoneyline: homeTeamMoneyline,
                  }),
                };
                if (findOdd?.length == 0) {
                  const oddsData = new NflOdds(data);
                  const savedOddsData = await oddsData.save();
                } else if (findOdd?.length > 0) {
                  if (findMatch?.status == "Not Started") {
                    data.status = findMatch?.status;
                    await NflOdds.findOneAndUpdate(
                      {
                        goalServeMatchId:
                          matchArray[i]?.week[j]?.matches[k]?.match[l]
                            ?.contestID,
                      },
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
                    await NflOdds.updateOne(
                      {
                        goalServeMatchId:
                          matchArray[i]?.week[j]?.matches[k]?.match[l]
                            ?.contestID,
                        status: findMatch?.status,
                      },
                      { $set: data },
                      { upsert: true }
                    );
                  } else {
                    const findOddWithStatus = await NflOdds.find({
                      goalServeMatchId:
                        matchArray[i]?.week[j]?.matches[k]?.match[l]?.contestID,
                      status: findMatch?.status,
                    });
                    if (findOddWithStatus.length > 0) {
                      return;
                    } else {
                      data.status = findMatch?.status;
                      const oddsData = new NflOdds(data);
                      const savedOddsData = await oddsData.save();
                    }
                  }
                }
              }
              continue;
              // return;
            }
            continue;
          } else {
            for (
              let m = 0;
              m < matchArray[i]?.week[j].matches?.match.length;
              m++
            ) {
              const findOdd = await NflOdds.find({
                goalServeMatchId:
                  matchArray[i]?.week[j]?.matches?.match[m]?.contestID,
              });
              const findMatch = await NflMatch.findOne({
                goalServeMatchId:
                  matchArray[i]?.week[j]?.matches?.match[m]?.contestID,
              });
              const getMoneyLine: any = await getOdds(
                "Home/Away",
                matchArray[i]?.week[j]?.matches?.match[m]?.odds?.type
              );
              const awayTeamMoneyline = getMoneyLine
                ? getMoneyLine?.odd?.find((item: any) => item?.name === "2")
                : undefined;
              const homeTeamMoneyline = getMoneyLine
                ? getMoneyLine?.odd?.find((item: any) => item?.name === "1")
                : undefined;
              // getSpread
              const getSpread = await getOdds(
                "Handicap",
                matchArray[i]?.week[j]?.matches?.match[m]?.odds?.type
              );
              const getAwayTeamRunLine = (await getSpread)
                ? getSpread?.handicap?.odd?.find(
                    (item: any) => item?.name === "2"
                  )
                : {};
              const getHomeTeamRunLine = (await getSpread)
                ? getSpread?.handicap?.odd?.find(
                    (item: any) => item?.name === "1"
                  )
                : {};
              const total = await getTotal(
                "Over/Under",
                matchArray[i]?.week[j]?.matches?.match[m]?.odds?.type
              );
              const totalValues = await getTotalValues(total);
              const data = {
                status: matchArray[i]?.week[j]?.matches?.match[m]?.status,
                goalServerLeagueId: league?.goalServeLeagueId,
                goalServeMatchId:
                  matchArray[i]?.week[j]?.matches?.match[m]?.contestID,
                goalServeHomeTeamId:
                  matchArray[i]?.week[j]?.matches?.match[m]?.hometeam?.id,
                goalServeAwayTeamId:
                  matchArray[i]?.week[j]?.matches?.match[m]?.awayteam?.id,
                // homeTeamSpread: homeTeamSpread,
                ...(getHomeTeamRunLine && {
                  homeTeamSpread: getHomeTeamRunLine,
                }),
                ...(getHomeTeamRunLine?.us && {
                  homeTeamSpreadUs: getHomeTeamRunLine?.us,
                }),
                // homeTeamTotal: totalValues,
                ...(totalValues && { homeTeamTotal: totalValues }),
                // awayTeamSpread: awayTeamSpread,
                ...(getAwayTeamRunLine && {
                  awayTeamSpread: getAwayTeamRunLine,
                }),
                ...(getAwayTeamRunLine?.us && {
                  awayTeamSpreadUs: getAwayTeamRunLine?.us,
                }),
                // awayTeamTotal: totalValues,
                ...(totalValues && { awayTeamTotal: totalValues }),
                ...(awayTeamMoneyline && {
                  awayTeamMoneyline: awayTeamMoneyline,
                }),
                ...(homeTeamMoneyline && {
                  homeTeamMoneyline: homeTeamMoneyline,
                }),
              };
              if (findOdd?.length == 0) {
                const oddsData = new NflOdds(data);
                const savedOddsData = await oddsData.save();
              } else if (findOdd?.length > 0) {
                if (findMatch?.status == "Not Started") {
                  data.status = findMatch?.status;
                  await NflOdds.findOneAndUpdate(
                    {
                      goalServeMatchId:
                        matchArray[i]?.week[j]?.matches?.match[m]?.contestID,
                    },
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
                  await NflOdds.updateOne(
                    {
                      goalServeMatchId:
                        matchArray[i]?.week[j]?.matches?.match[m]?.contestID,
                      status: findMatch?.status,
                    },
                    { $set: data },
                    { upsert: true }
                  );
                } else {
                  const findOddWithStatus = await NflOdds.find({
                    goalServeMatchId:
                      matchArray[i]?.week[j]?.matches?.match[m]?.contestID,
                    status: findMatch?.status,
                  });
                  if (findOddWithStatus.length > 0) {
                    return;
                  } else {
                    data.status = findMatch?.status;
                    const oddsData = new NflOdds(data);
                    const savedOddsData = await oddsData.save();
                  }
                }
              }
            }
            continue;
          }
        }
        continue;

        return true;
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };

  public updateLiveMatchRemainingData = async () => {
    try {
      const getMatch: any = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/nfl-scores`,
        { json: true }
      );
      const matchArrayAll = await getMatch?.data?.scores?.category?.match;
      const matchArray = matchArrayAll.filter((element: any) => {
        return element.status !== "Not Started";
      });
      if (matchArray?.length > 0 && matchArray) {
        for (let i = 0; i < matchArray?.length; i++) {
          const data: Partial<INflMatchModel> = {
            awayTeamDefensive: matchArray[i]?.defensive?.awayteam?.player
              ? matchArray[i]?.defensive?.awayteam?.player
              : [],
            homeTeamDefensive: matchArray[i]?.defensive?.hometeam?.player
              ? matchArray[i]?.defensive?.hometeam?.player
              : [],

            firstQuarterEvent: matchArray[i]?.events?.firstquarter?.event
              ? matchArray[i]?.events?.firstquarter?.event
              : [],
            fourthQuarterEvent: matchArray[i]?.events?.fourthquarter?.event
              ? matchArray[i]?.events?.fourthquarter?.event
              : [],
            overtimeEvent: matchArray[i]?.events?.overtime?.event
              ? matchArray[i]?.events?.overtime?.event
              : [],
            secondQuarterEvent: matchArray[i]?.events?.secondquarter?.event
              ? matchArray[i]?.events?.secondquarter?.event
              : [],
            thirdQuarterEvent:
              matchArray[i]?.events?.thirdquarter?.event != null
                ? matchArray[i]?.events?.thirdquarter?.event
                : [],

            awayTeamFumbles: matchArray[i]?.fumbles?.awayteam?.player
              ? matchArray[i]?.fumbles?.awayteam?.player
              : [],
            homeTeamFumbles: matchArray[i]?.fumbles?.hometeam?.player
              ? matchArray[i]?.fumbles?.hometeam?.player
              : [],

            awayTeamInterceptions: matchArray[i]?.interceptions?.awayteam
              ?.player
              ? matchArray[i]?.interceptions?.awayteam?.player
              : [],
            homeTeamInterceptions: matchArray[i]?.interceptions?.hometeam
              ?.player
              ? matchArray[i]?.interceptions?.hometeam?.player
              : [],

            awayTeamKickReturn: matchArray[i]?.kick_returns?.awayteam?.player
              ? matchArray[i]?.kick_returns?.awayteam?.player
              : [],
            homeTeamKickReturn: matchArray[i]?.kick_returns?.hometeam?.player
              ? matchArray[i]?.kick_returns?.hometeam?.player
              : [],

            awayTeamKick: matchArray[i]?.kicking?.awayteam?.player
              ? matchArray[i]?.kicking?.awayteam?.player
              : {},
            homeTeamKick: matchArray[i]?.kicking?.hometeam?.player
              ? matchArray[i]?.kicking?.hometeam?.player
              : {},

            awayTeamPassing: matchArray[i]?.passing?.awayteam?.player
              ? matchArray[i]?.passing?.awayteam?.player
              : [],
            homeTeamPassing: matchArray[i]?.passing?.hometeam?.player
              ? matchArray[i]?.passing?.hometeam?.player
              : [],

            awayTeamPuntReturns: matchArray[i]?.punt_returns?.awayteam?.player
              ? matchArray[i]?.punt_returns?.awayteam?.player
              : [],
            homeTeamPuntReturns: matchArray[i]?.punt_returns?.hometeam?.player
              ? matchArray[i]?.punt_returns?.hometeam?.player
              : [],

            awayTeamPunting: matchArray[i]?.punting?.awayteam?.player
              ? matchArray[i]?.punting?.awayteam?.player
              : [],
            homeTeamPunting: matchArray[i]?.punting?.hometeam?.player
              ? matchArray[i]?.punting?.hometeam?.player
              : [],

            awayTeamReceiving: matchArray[i]?.receiving?.awayteam?.player
              ? matchArray[i]?.receiving?.awayteam?.player
              : [],
            homeTeamReceiving: matchArray[i]?.receiving?.hometeam?.player
              ? matchArray[i]?.receiving?.hometeam?.player
              : [],

            awayTeamRushing: matchArray[i]?.rushing?.awayteam?.player
              ? matchArray[i]?.rushing?.awayteam?.player
              : [],
            homeTeamRushing: matchArray[i]?.rushing?.hometeam?.player
              ? matchArray[i]?.rushing?.hometeam?.player
              : [],
          };
          const dataUpdate = await NflMatch.findOneAndUpdate(
            { goalServeMatchId: matchArray[i]?.contestID },
            { $set: data },
            { new: true }
          );
        }
      } else {
        if (matchArray) {
          const data: Partial<INflMatchModel> = {
            awayTeamDefensive: matchArray?.defensive?.awayteam?.player
              ? matchArray?.defensive?.awayteam?.player
              : [],
            homeTeamDefensive: matchArray?.defensive?.hometeam?.player
              ? matchArray?.defensive?.hometeam?.player
              : [],

            firstQuarterEvent: matchArray?.events?.firstquarter?.event
              ? matchArray?.events?.firstquarter?.event
              : [],
            fourthQuarterEvent: matchArray?.events?.fourthquarter?.event
              ? matchArray?.events?.fourthquarter?.event
              : [],
            overtimeEvent: matchArray?.events?.overtime?.event
              ? matchArray?.events?.overtime?.event
              : [],
            secondQuarterEvent: matchArray?.events?.secondquarter?.event
              ? matchArray?.events?.secondquarter?.event
              : [],
            thirdQuarterEvent:
              matchArray?.events?.thirdquarter?.event != null
                ? matchArray?.events?.thirdquarter?.event
                : [],

            awayTeamFumbles: matchArray?.fumbles?.awayteam?.player
              ? matchArray?.fumbles?.awayteam?.player
              : [],
            homeTeamFumbles: matchArray?.fumbles?.hometeam?.player
              ? matchArray?.fumbles?.hometeam?.player
              : [],

            awayTeamInterceptions: matchArray?.interceptions?.awayteam?.player
              ? matchArray?.interceptions?.awayteam?.player
              : [],
            homeTeamInterceptions: matchArray?.interceptions?.hometeam?.player
              ? matchArray?.interceptions?.hometeam?.player
              : [],

            awayTeamKickReturn: matchArray?.kick_returns?.awayteam?.player
              ? matchArray?.kick_returns?.awayteam?.player
              : [],
            homeTeamKickReturn: matchArray?.kick_returns?.hometeam?.player
              ? matchArray?.kick_returns?.hometeam?.player
              : [],

            awayTeamKick: matchArray?.kicking?.awayteam?.player
              ? matchArray?.kicking?.awayteam?.player
              : {},
            homeTeamKick: matchArray?.kicking?.hometeam?.player
              ? matchArray?.kicking?.hometeam?.player
              : {},

            awayTeamPassing: matchArray?.passing?.awayteam?.player
              ? matchArray?.passing?.awayteam?.player
              : [],
            homeTeamPassing: matchArray?.passing?.hometeam?.player
              ? matchArray?.passing?.hometeam?.player
              : [],

            awayTeamPuntReturns: matchArray?.punt_returns?.awayteam?.player
              ? matchArray?.punt_returns?.awayteam?.player
              : [],
            homeTeamPuntReturns: matchArray?.punt_returns?.hometeam?.player
              ? matchArray?.punt_returns?.hometeam?.player
              : [],

            awayTeamPunting: matchArray?.punting?.awayteam?.player
              ? matchArray?.punting?.awayteam?.player
              : [],
            homeTeamPunting: matchArray?.punting?.hometeam?.player
              ? matchArray?.punting?.hometeam?.player
              : [],

            awayTeamReceiving: matchArray?.receiving?.awayteam?.player
              ? matchArray?.receiving?.awayteam?.player
              : [],
            homeTeamReceiving: matchArray?.receiving?.hometeam?.player
              ? matchArray?.receiving?.hometeam?.player
              : [],

            awayTeamRushing: matchArray?.rushing?.awayteam?.player
              ? matchArray?.rushing?.awayteam?.player
              : [],
            homeTeamRushing: matchArray?.rushing?.hometeam?.player
              ? matchArray?.rushing?.hometeam?.player
              : [],
          };
          const dataUpdate = await NflMatch.findOneAndUpdate(
            { goalServeMatchId: matchArray?.contestID },
            { $set: data },
            { new: true }
          );
        }
      }
    } catch (error) {
      console.log("error", error);
    }
  };
}
