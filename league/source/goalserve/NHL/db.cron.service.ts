import { axiosGet } from "../../services/axios.service";
import { goalserveApi } from "../../services/goalserve.service";
import socket from "../../services/socket.service";
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
const getOdds = (nameKey: string, myArray: any) => {
  for (let i = 0; i < myArray?.length; i++) {
    if (myArray[i].value == nameKey) {
      return myArray[i];
    }
  }
};
const getTotal = (nameKey: string, myArray: any) => {
  if (myArray?.length > 0) {
    for (let i = 0; i < myArray?.length; i++) {
      if (myArray[i].value == nameKey) {
        return myArray[i];
      }
    }
  }
};
const getRunLine = async (nameKey: string, myArray: any) => {
    for (let i = 0; i < myArray?.length; i++) {
      if (myArray[i].name.split(" ").slice(0, -1).join(" ") == nameKey) {
        return myArray[i];
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
export default class NhlDbCronServiceClass {
  
  public updateCurruntDateRecordNhl = async () => {
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
  public updateStandingNhl = async () => {
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
  public updatePlayersNhl = async () => {
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
  public updateInjuredPlayerNHL = async () => {
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
  public createAndUpdateOddsNhl = async () => {
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
  public updateNhlMatch = async () => {
    try {
      const getMatch = await axiosGet(
        `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/hockey/nhl-shedule`,
        { json: true }
      );
      let matchesNeedToRemove = await NhlMatch.find({
        goalServeLeagueId: getMatch?.data?.shedules?.id,
        "status" : "Not Started"
      }).lean();
      const matchArray = await getMatch?.data?.shedules?.matches;
      const league: any = await League.findOne({
        goalServeLeagueId: getMatch?.data?.shedules?.id,
      });
      for (let i = 0; i < matchArray?.length; i++) {
        for (let j = 0; j < matchArray[i]?.match?.length; j++) {
          matchesNeedToRemove = await removeByAttr(matchesNeedToRemove, 'goalServerMatchId', Number(matchArray[i]?.match[j]?.id))
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
          goalServeMatchId : match.goalServeMatchId
        });
      }
      return true;
    } catch (error: any) {
      console.log("error", error);
    }
  };
}
