import httpStatus from "http-status";
import { IDivision, ITeam } from "../../interfaces/input";
import { goalserveApi } from "../../services/goalserve.service";
import League from "../../models/documents/league.model";
import moment from "moment";
import Player from "../../models/documents/MLB/player.model";
import Team from "../../models/documents/MLB/team.model";
import { isArray } from "lodash";
import Match from "../../models/documents/MLB/match.model";
import Bet from "../../models/documents/bet.model";
import Standings from "../../models/documents/MLB/standing.model";
import Injury from "../../models/documents/MLB/injuy.model";
import Odd from "../../models/documents/MLB/odd.model";
import StatsTeam from "../../models/documents/MLB/teamStats.model";
import ITeamModel from "../../models/interfaces/team.interface";
import IMatchModel from "../../models/interfaces/match.interface";
import ILeagueModel from "../../models/interfaces/league.interface";
import IOddModel from "../../models/interfaces/odd.interface";
import { axiosGet } from "../../services/axios.service";
import { betStatus } from "../../models/interfaces/bet.interface";
async function declareResultMatch(
  matchId: number,
  winTeamId: number,
  leagueType: string
) {
  await Bet.updateMany(
    {
      goalServeMatchId: matchId,
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
function camelize(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
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
export default class MlbDbCronServiceClass {
  public updateCurruntDateRecord = async () => {
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
        for (let j = 0; j > matchArray?.length; j++) {
          const league: ILeagueModel | undefined | null = await League.findOne({
            goalServeLeagueId: getMatch?.data.scores.category.id,
          });
          if (
            matchArray[j].status != "Not Started" &&
            matchArray[j].status != "Final"
          ) {
            const data: Partial<IMatchModel> = {
              leagueId: league?._id,
              goalServeLeagueId: league?.goalServeLeagueId,
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
            const teamIdAway: ITeamModel | null | undefined =
              await Team.findOne({
                goalServeTeamId: matchArray[j].awayteam.id,
              });
            if (teamIdAway) {
              data.awayTeamId = teamIdAway.id;
              data.goalServeAwayTeamId = teamIdAway.goalServeTeamId;
            }
            const teamIdHome: ITeamModel | null | undefined =
              await Team.findOne({
                goalServeTeamId: matchArray[j].hometeam.id,
              });
            if (teamIdHome) {
              data.homeTeamId = teamIdHome.id;
              data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
            }
            await Match.findOneAndUpdate(
              { goalServeMatchId: data.goalServeMatchId },
              { $set: data },
              { new: true, upsert: true }
            );
          } else {
            const data: Partial<IMatchModel> = {
              leagueId: league?._id,
              goalServeLeagueId: league?.goalServeLeagueId,
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
            if (matchArray[j].status == "Final") {
              const findMatch = await Match.findOne({
                channelExpireTime: {
                  $eq: null,
                },
              });
              if(findMatch){
                const endDate = moment().add(2, "hours");
                data.channelExpireTime = endDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
              }
            }
            const teamIdAway: ITeamModel | null | undefined =
              await Team.findOne({
                goalServeTeamId: matchArray[j].awayteam.id,
              });
            if (teamIdAway) {
              data.awayTeamId = teamIdAway.id;
              data.goalServeAwayTeamId = teamIdAway.goalServeTeamId;
            }
            const teamIdHome: ITeamModel | null | undefined =
              await Team.findOne({
                goalServeTeamId: matchArray[j].hometeam.id,
              });
            if (teamIdHome) {
              data.homeTeamId = teamIdHome.id;
              data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
            }
            await Match.findOneAndUpdate(
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
            // expire not accepted bet requests
            await Bet.updateMany(
              {
                status: "PENDING",
                goalServeMatchId: goalServeMatchId,
                leagueType: "MLB",
              },
              {
                status: "EXPIRED",
              }
            );
            // active  CONFIRMED bet when match start
            await Bet.updateMany(
              {
                status: "CONFIRMED",
                goalServeMatchId: goalServeMatchId,
                leagueType: "MLB",
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
            await declareResultMatch(
              parseInt(goalServeMatchId),
              parseInt(goalServeWinTeamId),
              "MLB"
            );
          } else if (
            matchArray[j].status == "Canceled" ||
            matchArray[j].status == "Postponed" ||
            matchArray[j].status == "Suspended"
          ) {
            const goalServeMatchId = matchArray[j].id;
            await Bet.updateMany(
              {
                status: "PENDING",
                goalServeMatchId: goalServeMatchId,
                leagueType: "MLB",
              },
              {
                status: "EXPIRED",
              }
            );
            await Bet.updateMany(
              {
                status: { $in: ["CONFIRMED", "ACTIVE"] },
                goalServeMatchId: goalServeMatchId,
                leagueType: "MLB",
              },
              {
                status: "CANCELED",
              }
            );
          }
        }
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };

  public updateInjuryRecored = async () => {
    const team = await Team.find({ isDeleted: false });
    await Promise.all(
      team.map(async (item) => {
        let data = {
          json: true,
        };
        const injuryApi = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          data,
          `baseball/${item?.goalServeTeamId}__injuries`
        );

        const injuryArray1 = injuryApi?.data?.team;
        const existingPlayers = await Injury.find({
          goalServeTeamId: item?.goalServeTeamId,
        });
        if (injuryArray1?.report?.length) {
          // Find the extra entries in the existingPlayers array
          const extraEntries = existingPlayers.filter((player) => {
            const playerExists = injuryArray1?.report?.some(
              (val: any) => val?.player_id === player.goalServePlayerId
            );
            return !playerExists;
          });
          await Injury.deleteMany({
            _id: { $in: extraEntries.map((player) => player._id) },
          });

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
              await Injury.updateOne(
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
          await Injury.deleteMany({
            _id: { $in: extraEntries.map((player) => player._id) },
          });
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

          await Injury.updateOne(
            {
              goalServeTeamId: data?.goalServeTeamId,
              goalServePlayerId: data?.goalServePlayerId,
            },
            { $set: data },
            { upsert: true }
          );
        } else {
          await Injury.deleteMany({
            _id: { $in: existingPlayers.map((player) => player._id) },
          });
        }
      })
    );
  };

  public updateStandingRecord = async () => {
    let data = {
      json: true,
    };
    const getstanding = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/mlb_standings"
    );

    const league: ILeagueModel | undefined | null = await League.findOne({
      goalServeLeagueId: getstanding?.data?.standings?.category?.id,
    });
    getstanding?.data?.standings?.category?.league?.map((item: any) => {
      item.division.map((div: any) => {
        div.team.map(async (team: any) => {
          const teamId: ITeamModel | null | undefined = await Team.findOne({
            goalServeTeamId: team.id,
          });
          let data = {
            leagueId: league?._id,
            leagueType: item?.name,
            goalServeLeagueId: getstanding?.data?.standings?.category?.id,
            division: div?.name,
            away_record: team?.away_record,
            current_streak: team?.current_streak,
            games_back: team?.games_back,
            home_record: team.home_record,
            teamId: teamId?.id,
            goalServeTeamId: teamId?.goalServeTeamId,
            pct: +(
              Number(team.won) /
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

          await Standings.findOneAndUpdate(
            { goalServeTeamId: data.goalServeTeamId },
            { $set: data },
            { new: true, upsert: true }
          );
        });
      });
    });
  };
  public updateTeamStats = async () => {
    let data = {
      json: true,
    };
    const teamStatsNl = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/mlb_team_batting"
    );

    await Promise.all(
      teamStatsNl.data.statistic.category.team.map(async (item: any) => {
        const team = await Team.findOne({ name: item.name });
        let data = item;
        data.category = teamStatsNl.data.statistic.category.name;
        data.teamId = team?.id;
        data.goalServeTeamId = team?.goalServeTeamId;
        data.battingRank = teamStatsNl?.data.statistic.category.rank;
        await StatsTeam.findOneAndUpdate(
          { goalServeTeamId: data.goalServeTeamId },
          { $set: data },
          { new: true, upsert: true }
        );
      })
    );

    const teamStatsAL = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/mlb_team_batting"
    );

    await Promise.all(
      teamStatsAL.data.statistic.category.team.map(async (item: any) => {
        const team = await Team.findOne({ Name: item.name });
        let data = item;
        data.category = teamStatsAL.data.statistic.category.name;
        data.teamId = team?.id;
        data.goalServeTeamId = team?.goalServeTeamId;
        data.battingRank = teamStatsAL?.data.statistic.category.rank;
        await StatsTeam.findOneAndUpdate(
          { goalServeTeamId: data.goalServeTeamId },
          { $set: data },
          { new: true, upsert: true }
        );
      })
    );
    const teamStatsNlPitching = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/mlb_team_pitching"
    );

    await Promise.all(
      teamStatsNlPitching.data.statistic.category.team.map(
        async (item: any) => {
          const team = await Team.findOne({ Name: item.name });
          let data = item;
          data.category = teamStatsNlPitching.data.statistic.category.name;
          data.teamId = team?.id;
          data.goalServeTeamId = team?.goalServeTeamId;
          data.pitchingRank = teamStatsNlPitching?.data.statistic.category.rank;
          await StatsTeam.findOneAndUpdate(
            { goalServeTeamId: data.goalServeTeamId },
            { $set: data },
            { new: true, upsert: true }
          );
        }
      )
    );

    const teamStatsALPitching = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "baseball/mlb_team_pitching"
    );

    await Promise.all(
      teamStatsALPitching.data.statistic.category.team.map(
        async (item: any) => {
          const team = await Team.findOne({ name: item.name });
          let data = item;
          data.category = teamStatsALPitching.data.statistic.category.name;
          data.teamId = team?.id;
          data.goalServeTeamId = team?.goalServeTeamId;
          data.pitchingRank = teamStatsALPitching?.data.statistic.category.rank;
          await StatsTeam.findOneAndUpdate(
            { goalServeTeamId: data.goalServeTeamId },
            { $set: data },
            { new: true, upsert: true }
          );
        }
      )
    );
  };
  public updatePlayerStats = async () => {
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
              player.positionType = item.name;
              allRosterPlayers.push(player);
            });
          } else {
            let player = item.player;
            player.positionType = item.name;
            allRosterPlayers.push(player);
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
            positionType: eVal?.positionType,
          };
          await Player.findOneAndUpdate(
            { goalServePlayerId: eVal.id },
            { $set: data },
            { new: true, upsert: true }
          );
        });
      })
    );
  };
  public createOdds = async () => {
    let subDate = moment()
      .startOf("day")
      .subtract(24, "hours")
      .utc()
      .toISOString();
    let addDate = moment().add(30, "days").utc().toISOString();
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
      const getScore = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        "baseball/mlb_shedule"
      );
      var matchData = getScore?.data?.fixtures?.category?.matches;
      if (matchData?.length > 0) {
        for (let i = 0; i > matchData?.length; i++) {
          for (let j = 0; j > matchData[i]?.match?.length; j++) {
            const findOdd = await Odd.find({
              goalServeMatchId: matchData[i]?.match[j].id,
            });
            const league: ILeagueModel | undefined | null =
              await League.findOne({
                goalServeLeagueId: getScore?.data.fixtures?.category?.id,
              });
            const getMoneyLine: any = await getOdds(
              "Home/Away",
              matchData[i]?.match[j]?.odds?.type
            );
            const awayTeamMoneyline = getMoneyLine
              ? getMoneyLine?.odd?.find((item: any) => item?.name === "2")
              : {};
            const homeTeamMoneyline = getMoneyLine
              ? getMoneyLine?.odd?.find((item: any) => item?.name === "1")
              : {};
            // getSpread
            const getSpread = await getOdds(
              "Run Line",
              matchData[i]?.match[j]?.odds?.type
            );
            const getAwayTeamRunLine = await getRunLine(
              matchData[i]?.match[j]?.awayteam?.name,
              getSpread?.odd
            );
            const getHomeTeamRunLine = await getRunLine(
              matchData[i]?.match[j]?.hometeam?.name,
              getSpread?.odd
            );
            const awayTeamSpread = getAwayTeamRunLine
              ? getAwayTeamRunLine?.name?.split(" ").slice(-1)[0]
              : "";

            const homeTeamSpread = getHomeTeamRunLine
              ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
              : "";
            const total = await getTotal(
              "Over/Under",
              matchData[i]?.match[j]?.odds?.type
            );
            const totalValues = await getTotalValues(total);
            let data = {
              goalServerLeagueId: league?.goalServeLeagueId,
              goalServeMatchId: matchData[i]?.match[j]?.id,
              goalServeHomeTeamId: matchData[i]?.match[j]?.hometeam?.id,
              goalServeAwayTeamId: matchData[i]?.match[j]?.awayteam?.id,
              // homeTeamSpread: homeTeamSpread,
              ...(homeTeamSpread && { homeTeamSpread: homeTeamSpread }),
              ...(getHomeTeamRunLine?.us && {
                homeTeamSpreadUs: getHomeTeamRunLine?.us,
              }),
              // homeTeamTotal: totalValues,
              ...(totalValues && { homeTeamTotal: totalValues }),
              // awayTeamSpread: awayTeamSpread,
              ...(awayTeamSpread && { awayTeamSpread: awayTeamSpread }),
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
              const oddsData = new Odd(data);
              const savedOddsData = await oddsData.save();
            }
          }
        }
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };
  public createOrUpdateOdds = async () => {
    let subDate = moment()
      .startOf("day")
      .subtract(24, "hours")
      .utc()
      .toISOString();
    let addDate = moment().add(30, "days").utc().toISOString();
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
        date1: date1,
        date2: date2,
        showodds: "1",
        bm: "455,451",
      };
      const getScore = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        data,
        "baseball/mlb_schedule"
      );
      var matchData = getScore?.data?.fixtures?.category?.matches;
      if (matchData?.length > 0) {
        let data: Partial<IOddModel>;
        for (let i = 0; i < matchData?.length; i++) {
          for (let j = 0; j < matchData[i]?.match?.length; j++) {
            const findOdd = await Odd.find({
              goalServeMatchId: matchData[i]?.match[j].id,
            });
            const findMatch = await Match.findOne({
              goalServeMatchId: matchData[i]?.match[j].id,
            });
            const league: ILeagueModel | undefined | null =
              await League.findOne({
                goalServeLeagueId: getScore?.data.fixtures?.category?.id,
              });
            const getMoneyLine: any = await getOdds(
              "Home/Away",
              matchData[i]?.match[j]?.odds?.type
            );
            const awayTeamMoneyline = getMoneyLine
              ? getMoneyLine?.odd?.find((item: any) => item?.name === "2")
              : undefined;
            const homeTeamMoneyline = getMoneyLine
              ? getMoneyLine?.odd?.find((item: any) => item?.name === "1")
              : undefined;
            // getSpread
            const getSpread = await getOdds(
              "Run Line",
              matchData[i]?.match[j]?.odds?.type
            );
            const getAwayTeamRunLine = await getRunLine(
              matchData[i]?.match[j]?.awayteam?.name,
              getSpread?.odd
            );
            const getHomeTeamRunLine = await getRunLine(
              matchData[i]?.match[j]?.hometeam?.name,
              getSpread?.odd
            );
            const awayTeamSpread = getAwayTeamRunLine
              ? getAwayTeamRunLine?.name?.split(" ").slice(-1)[0]
              : "";

            const homeTeamSpread = getHomeTeamRunLine
              ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
              : "";
            const total = await getTotal(
              "Over/Under",
              matchData[i]?.match[j]?.odds?.type
            );
            const totalValues = await getTotalValues(total);
            data = {
              goalServerLeagueId: league?.goalServeLeagueId,
              goalServeMatchId: matchData[i]?.match[j]?.id,
              goalServeHomeTeamId: matchData[i]?.match[j]?.hometeam?.id,
              goalServeAwayTeamId: matchData[i]?.match[j]?.awayteam?.id,
              // homeTeamSpread: homeTeamSpread,
              ...(homeTeamSpread && { homeTeamSpread: homeTeamSpread }),
              ...(getHomeTeamRunLine?.us && {
                homeTeamSpreadUs: getHomeTeamRunLine?.us,
              }),
              // homeTeamTotal: totalValues,
              ...(totalValues && { homeTeamTotal: totalValues }),
              // awayTeamSpread: awayTeamSpread,
              ...(awayTeamSpread && { awayTeamSpread: awayTeamSpread }),
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
            if (findOdd?.length > 0) {
              if (findMatch?.status == "Not Started") {
                data.status = findMatch?.status;
                await Odd.findOneAndUpdate(
                  { goalServeMatchId: matchData[i]?.match[j].id },
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
                await Odd.updateOne(
                  {
                    goalServeMatchId: matchData[i]?.match[j].id,
                    status: findMatch?.status,
                  },
                  { $set: data },
                  { upsert: true }
                );
              } else {
                const findOddWithStatus = await Odd.find({
                  goalServeMatchId: matchData[i]?.match[j].id,
                  status: findMatch?.status,
                });
                if (findOddWithStatus.length > 0) {
                  return;
                } else {
                  data.status = findMatch?.status;
                  const oddsData = new Odd(data);
                  const savedOddsData = await oddsData.save();
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };
  public updateMlbMatch = async () => {
    try {
      const mlb_shedule = await axiosGet(
        `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/baseball/mlb_shedule`,
        { json: true }
      );
      // let matchesNeedToRemove = await Match.find({
      //   goalServeLeagueId: mlb_shedule?.data?.shedules?.id,
      //   status: "Not Started",
      // }).lean();

      const matchArray = await mlb_shedule?.data?.fictures?.category?.matches;

      const league: ILeagueModel | undefined | null = await League.findOne({
        goalServeLeagueId: mlb_shedule?.data.fixtures?.category?.id,
      });
      for (let i = 0; i < matchArray?.length; i++) {
        for (let j = 0; j < matchArray[i].match?.length; j++) {
          // matchesNeedToRemove = await removeByAttr(
          //   matchesNeedToRemove,
          //   "goalServerMatchId",
          //   Number(matchArray[i]?.match[j]?.id)
          // );
          const match: IMatchModel | null = await Match.findOne({
            goalServeMatchId: matchArray[i]?.match[j]?.id,
          });
          if (!match) {
            const data: Partial<IMatchModel> = {
              leagueId: league?._id,
              goalServeLeagueId: league?.goalServeLeagueId,
              outs: matchArray[i].match[j].outs,
              date: matchArray[i].match[j].date,
              formattedDate: matchArray[i].match[j].formatted_date,
              timezone: matchArray[i].match[j].timezone,
              oddsid: matchArray[i].match[j].seasonType,
              attendance: matchArray[i].match[j].attendance,
              goalServeMatchId: matchArray[i].match[j].id,
              dateTimeUtc: matchArray[i].match[j].datetime_utc,
              status: matchArray[i].match[j].status,
              time: matchArray[i].match[j].time,
              goalServeVenueId: matchArray[i].match[j].venue_id,
              venueName: matchArray[i].match[j].venue_name,
              homeTeamHit: matchArray[i].match[j].hometeam.hits,
              homeTeamTotalScore: matchArray[i].match[j].hometeam.totalscore,
              homeTeamError: matchArray[i].match[j].hometeam.errors,
              awayTeamHit: matchArray[i].match[j].awayteam.hits,
              awayTeamTotalScore: matchArray[i].match[j].awayteam.totalscore,
              awayTeamError: matchArray[i].match[j].awayteam.errors,
              awayTeamInnings: matchArray[i].match[j].awayteam?.innings?.inning
                ? matchArray[i].match[j].awayteam?.innings?.inning
                : [],
              homeTeamInnings: matchArray[i].match[j].hometeam?.innings?.inning
                ? matchArray[i].match[j].hometeam?.innings?.inning
                : [],
              event: matchArray[i].match[j].events?.event
                ? matchArray[i].match[j].events?.event
                : [],
              startingPitchers: matchArray[i].match[j].starting_pitchers,
              awayTeamHitters: matchArray[i].match[j].stats?.hitters?.awayteam
                ?.player
                ? matchArray[i].match[j].stats?.hitters?.awayteam?.player
                : [],
              homeTeamHitters: matchArray[i].match[j].stats?.hitters?.hometeam
                ?.player
                ? matchArray[i].match[j].stats?.hitters?.hometeam?.player
                : [],
              awayTeamPitchers: matchArray[i].match[j].stats?.pitchers?.awayteam
                ?.player
                ? matchArray[i].match[j].stats?.pitchers?.awayteam?.player
                : [],
              homeTeamPitchers: matchArray[i].match[j].stats?.pitchers?.hometeam
                ?.player
                ? matchArray[i].match[j].stats?.pitchers?.hometeam?.player
                : [],
            };

            const teamIdAway: ITeamModel | null | undefined =
              await Team.findOne({
                goalServeTeamId: matchArray[i].match[j].awayteam.id,
              });
            if (teamIdAway) {
              data.awayTeamId = teamIdAway.id;
              data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
                ? teamIdAway?.goalServeTeamId
                : undefined;
            }
            const teamIdHome: ITeamModel | null | undefined =
              await Team.findOne({
                goalServeTeamId: matchArray[i].match[j].hometeam.id,
              });
            if (teamIdHome) {
              data.homeTeamId = teamIdHome.id;
              data.goalServeHomeTeamId = teamIdHome.goalServeTeamId;
            }
            const matchData = new Match(data);
            await matchData.save();
          }
        }
      }
      // for (let k = 0; k < matchesNeedToRemove.length; k++) {
      //   const match = matchesNeedToRemove[k];
      //   await Match.deleteOne({
      //     goalServeMatchId: match.goalServeMatchId,
      //   });
      // }
      return true;
    } catch (error: any) {
      console.log("error", error);
    }
  };
}
