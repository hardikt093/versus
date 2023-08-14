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
                  name: player.name,
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
                    playerData.isPassingPlayer = true;
                    playerData.passing = { ...player };
                    allPassingPlayer.push(playerData);
                    break;
                  case "Rushing":
                    playerData.isRushingPlayer = true;
                    playerData.rushing = { ...player };
                    allRushingPlayer.push(playerData);
                    break;
                  case "Receiving":
                    playerData.isReceivingPlayer = true;
                    playerData.receiving = { ...player };
                    allReceivingPlayer.push(playerData);
                    break;
                  case "Defense":
                    playerData.isDefensePlayer = true;
                    playerData.defence = { ...player };
                    allDefencePlayer.push(playerData);
                    break;
                  case "Scoring":
                    playerData.isScoringPlayer = true;
                    playerData.scoring = { ...player };
                    allScoringPlayer.push(playerData);
                    break;
                  case "Returning":
                    playerData.isReturningPlayer = true;
                    playerData.returning = { ...player };
                    allReturningPlayer.push(playerData);
                    break;
                  case "Kicking":
                    playerData.isKickingPlayer = true;
                    playerData.kicking = { ...player };
                    allKickingPlayer.push(playerData);
                    break;
                  case "Punting":
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
}
