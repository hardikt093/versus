import { axiosGet } from "../../services/axios.service";
import { goalserveApi } from "../../services/goalserve.service";
import League from "../../models/documents/league.model";
import moment from "moment";
import { isArray } from "lodash";
import TeamNBA from "../../models/documents/NBA/team.model";
import NbaMatch from "../../models/documents/NBA/match.model";
import PlayersNBA from "../../models/documents/NBA/player.model";
import NbaInjury from "../../models/documents/NBA/injury.model";
import NbaStandings from "../../models/documents/NBA/standings.model";
import NbaOdds from "../../models/documents/NBA/odds.model";
import NbaScoreSummary from "../../models/documents/NBA/scoreSummary.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import INbaMatchModel from "../../models/interfaces/nbaMatch.interface";
import { INbaPlayerhModel } from "../../models/interfaces/nbaPlayer.interface";
import ITeamNBAModel from "../../models/interfaces/teamNBA.interface";
import Bet from "../../models/documents/bet.model";
import { betStatus } from "../../models/interfaces/bet.interface";
async function declareResultMatch (
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
};
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
export default class NbaDbCronServiceClass {
  public createAndUpdateMatchOdds = async () => {
    let subDate = moment()
      .startOf("day")
      .subtract(12, "hours")
      .utc()
      .toISOString();
    let addDate = moment().add(24, "hours").utc().toISOString();
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
        bm: "451,",
      };
      const getScore = await goalserveApi(
        "http://www.goalserve.com/getfeed",
        data,
        "bsktbl/nba-shedule"
      );
      var matchData = getScore?.data?.shedules?.matches?.match;
      const league: ILeagueModel | null = await League.findOne({
        goalServeLeagueId: getScore?.data?.shedules?.id,
      });
      if (matchData?.length > 0) {
        const takeData = await matchData?.map(async (item: any) => {
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
          const getSpread = await getOdds("Handicap", item?.odds?.type);
          const getAwayTeamRunLine = (await getSpread)
            ? getSpread?.bookmaker?.handicap?.odd?.find(
                (item: any) => item?.name === "2"
              )
            : {};
          const getHomeTeamRunLine = (await getSpread)
            ? getSpread?.bookmaker?.handicap?.odd?.find(
                (item: any) => item?.name === "1"
              )
            : {};
          const total = await getTotal("Over/Under", item?.odds?.type);
          const totalValues = await getTotalValues(total);
          let data = {
            goalServerLeagueId: league?.goalServeLeagueId,
            goalServeMatchId: item?.id,
            goalServeHomeTeamId: item?.hometeam?.id,
            goalServeAwayTeamId: item?.awayteam?.id,
            homeTeamSpread: getHomeTeamRunLine,
            homeTeamTotal: totalValues,
            awayTeamSpread: getAwayTeamRunLine,
            awayTeamTotal: totalValues,
            awayTeamMoneyline: awayTeamMoneyline,
            homeTeamMoneyline: homeTeamMoneyline,
            status: item.status,
          };
          if (item.status == "Not Started") {
            const findMatchOdds = await NbaOdds.find({
              goalServeMatchId: item?.id,
              status: item?.status,
            });
            if (findMatchOdds?.length == 0) {
              const oddsData = new NbaOdds(data);
              await oddsData.save();
            } else {
              await NbaOdds.findOneAndUpdate(
                { goalServeMatchId: item?.id },
                { $set: data },
                { new: true }
              );
            }
          } else if (
            (item.status != "Not Started" &&
              item.status != "Final" &&
              item.status != "Final/OT" &&
              item.status != "Final/2OT" &&
              item.status != "Postponed" &&
              item.status != "Canceled",
            item.status != "Suspended")
          ) {
            const findMatchOdds = await NbaOdds.find({
              goalServeMatchId: item?.id,
              status: item?.status,
            });
            if (findMatchOdds?.length == 0) {
              const oddsData = new NbaOdds(data);
              await oddsData.save();
            } else {
              await NbaOdds.findOneAndUpdate(
                { goalServeMatchId: item?.id },
                { $set: data },
                { new: true }
              );
            }
          } else {
            const findMatchOdds = await NbaOdds.find({
              goalServeMatchId: item?.id,
              status: item?.status,
            });
            if (findMatchOdds?.length == 0) {
              const oddsData = new NbaOdds(data);
              oddsData.save();
            } else {
              const updateOdds = await NbaOdds.findOneAndUpdate(
                { goalServeMatchId: item?.id },
                { $set: data },
                { new: true }
              );
            }
          }
        });
      } else {
        if (matchData) {
          const league: ILeagueModel | null = await League.findOne({
            goalServeLeagueId: getScore?.data?.shedules?.id,
          });

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
          const getSpread = await getOdds("Handicap", matchData?.odds?.type);
          const getAwayTeamRunLine = getSpread
            ? getSpread?.bookmaker?.handicap?.odd?.find(
                (item: any) => item?.name === "2"
              )
            : {};

          const getHomeTeamRunLine = getSpread
            ? getSpread?.bookmaker?.handicap?.odd?.find(
                (item: any) => item?.name === "1"
              )
            : {};
          const total = await getTotal("Over/Under", matchData?.odds?.type);
          const totalValues = await getTotalValues(total);
          let data = {
            goalServerLeagueId: league?.goalServeLeagueId,
            goalServeMatchId: matchData?.id,
            goalServeHomeTeamId: matchData?.hometeam?.id,
            goalServeAwayTeamId: matchData?.awayteam?.id,
            homeTeamSpread: getHomeTeamRunLine,
            homeTeamTotal: totalValues,
            awayTeamSpread: getAwayTeamRunLine,
            awayTeamTotal: totalValues,
            awayTeamMoneyline: awayTeamMoneyline,
            homeTeamMoneyline: homeTeamMoneyline,
            status: matchData.status,
          };

          if (matchData.status == "Not Started") {
            const findMatchOdds = await NbaOdds.find({
              goalServeMatchId: matchData?.id,
              status: matchData?.status,
            });
            if (findMatchOdds?.length == 0) {
              const oddsData = new NbaOdds(data);
              const savedOddsData = await oddsData.save();
            } else {
              await NbaOdds.findOneAndUpdate(
                { goalServeMatchId: matchData?.id },
                { $set: data },
                { new: true }
              );
            }
          } else if (
            (matchData.status != "Not Started" &&
              matchData.status != "Final" &&
              matchData.status != "Final/OT" &&
              matchData.status != "Final/2OT" &&
              matchData.status != "Postponed" &&
              matchData.status != "Canceled",
            matchData.status != "Suspended")
          ) {
            const findMatchOdds = await NbaOdds.find({
              goalServeMatchId: matchData?.id,
              status: matchData?.status,
            });
            if (findMatchOdds?.length == 0) {
              const oddsData = new NbaOdds(data);
              await oddsData.save();
            } else {
              await NbaOdds.findOneAndUpdate(
                { goalServeMatchId: matchData?.id },
                { $set: data },
                { new: true }
              );
            }
          } else {
            const findMatchOdds = await NbaOdds.find({
              goalServeMatchId: matchData?.id,
              status: matchData?.status,
            });
            if (findMatchOdds?.length == 0) {
              const oddsData = new NbaOdds(data);
              await oddsData.save();
            } else {
              await NbaOdds.findOneAndUpdate(
                { goalServeMatchId: matchData?.id },
                { $set: data },
                { new: true }
              );
            }
          }
        }
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };
  public addMatchDataFutureForNba = async () => {
    try {
      const getDaysArray = function (start: Date, end: Date) {
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
      const daylist = getDaysArray(
        new Date("2023-06-02"),
        new Date("2023-06-19")
      );
      for (let i = 0; i < daylist?.length; i++) {
        let dataToStore: Partial<INbaMatchModel>[] = [];
        let getMatch: any = {};
        try {
          getMatch = await axiosGet(
            `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-shedule`,
            { json: true, date1: daylist[i] }
          );
        } catch (error) {
          continue;
        }
        if (getMatch) {
          const matchArray = await getMatch?.data?.shedules?.matches?.match;
          const league: ILeagueModel | null = await League.findOne({
            goalServeLeagueId: getMatch?.data?.shedules?.id,
          });

          if (matchArray?.length > 0 && matchArray) {
            // array logic
            for (let j = 0; j < matchArray?.length; j++) {
              const data: Partial<INbaMatchModel> = {
                leagueId: league?._id,
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
                goalServeHomeTeamId: matchArray[j].hometeam.id,
                goalServeAwayTeamId: matchArray[j].awayteam.id,
                // new entries
                timer: matchArray[j]?.timer ? matchArray[j]?.timer : "",
                awayTeamOt: matchArray[j].awayteam.ot,
                awayTeamQ1: matchArray[j].awayteam.q1,
                awayTeamQ2: matchArray[j].awayteam.q2,
                awayTeamQ3: matchArray[j].awayteam.q3,
                awayTeamQ4: matchArray[j].awayteam.q4,
                awayTeamPosession: matchArray[j].awayteam.posession,

                homeTeamOt: matchArray[j].hometeam.ot,
                homeTeamQ1: matchArray[j].hometeam.q1,
                homeTeamQ2: matchArray[j].hometeam.q2,
                homeTeamQ3: matchArray[j].hometeam.q3,
                homeTeamQ4: matchArray[j].hometeam.q4,
                homeTeamPosession: matchArray[j].hometeam.posession,

                teamStatsHomeTeam: matchArray[j]?.team_stats?.hometeam
                  ? matchArray[j]?.team_stats?.hometeam
                  : {},
                teamStatsAwayTeam: matchArray[j]?.team_stats?.awayteam
                  ? matchArray[j]?.team_stats?.awayteam
                  : {},

                playerStatsBenchAwayTeam: matchArray[j]?.player_stats?.awayteam
                  ?.bench?.player
                  ? matchArray[j]?.player_stats?.awayteam?.bench?.player
                  : [],
                playerStatsBenchHomeTeam: matchArray[j]?.player_stats?.hometeam
                  ?.bench?.player
                  ? matchArray[j]?.player_stats?.hometeam?.bench?.player
                  : [],
                playerStatsStartersAwayTeam: matchArray[j]?.player_stats
                  ?.awayteam?.starters?.player
                  ? matchArray[j]?.player_stats?.awayteam?.starters?.player
                  : [],
                playerStatsStartersHomeTeam: matchArray[j]?.player_stats
                  ?.hometeam?.starters?.player
                  ? matchArray[j]?.player_stats?.hometeam?.starters?.player
                  : [],
              };

              const teamIdAway: ITeamNBAModel | null | undefined =
                await TeamNBA.findOne({
                  goalServeTeamId: matchArray[j].awayteam.id,
                });

              data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
                ? teamIdAway.goalServeTeamId
                : 1;

              const teamIdHome: ITeamNBAModel | null | undefined =
                await TeamNBA.findOne({
                  goalServeTeamId: matchArray[j].hometeam.id,
                });

              data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
                ? teamIdHome.goalServeTeamId
                : 1;
              dataToStore.push(data);
            }
          } else {
            if (matchArray) {
              const data: Partial<INbaMatchModel> = {
                leagueId: league?._id,
                goalServeLeagueId: league?.goalServeLeagueId,
                date: matchArray.date,
                formattedDate: matchArray.formatted_date,
                dateTimeUtc: matchArray.datetime_utc,
                timezone: matchArray.timezone,
                attendance: matchArray.attendance,
                goalServeMatchId: matchArray.id,
                status: matchArray.status,
                time: matchArray.time,
                timer: matchArray?.timer ? matchArray?.timer : "",
                goalServeVenueId: matchArray.venue_id,
                venueName: matchArray.venue_name,
                homeTeamTotalScore: matchArray.hometeam.totalscore,
                awayTeamTotalScore: matchArray.awayteam.totalscore,
                goalServeHomeTeamId: matchArray.hometeam.id,
                goalServeAwayTeamId: matchArray.awayteam.id,
                // new entries
                awayTeamOt: matchArray.awayteam.ot,
                awayTeamQ1: matchArray.awayteam.q1,
                awayTeamQ2: matchArray.awayteam.q2,
                awayTeamQ3: matchArray.awayteam.q3,
                awayTeamQ4: matchArray.awayteam.q4,
                awayTeamPosession: matchArray.awayteam.posession,

                homeTeamOt: matchArray.hometeam.ot,
                homeTeamQ1: matchArray.hometeam.q1,
                homeTeamQ2: matchArray.hometeam.q2,
                homeTeamQ3: matchArray.hometeam.q3,
                homeTeamQ4: matchArray.hometeam.q4,
                homeTeamPosession: matchArray.hometeam.posession,

                teamStatsHomeTeam: matchArray?.team_stats?.hometeam
                  ? matchArray?.team_stats?.hometeam
                  : {},
                teamStatsAwayTeam: matchArray?.team_stats?.awayteam
                  ? matchArray?.team_stats?.awayteam
                  : {},

                playerStatsBenchAwayTeam: matchArray?.player_stats?.awayteam
                  ?.bench?.player
                  ? matchArray?.player_stats?.awayteam?.bench?.player
                  : [],
                playerStatsBenchHomeTeam: matchArray?.player_stats?.hometeam
                  ?.bench?.player
                  ? matchArray?.player_stats?.hometeam?.bench?.player
                  : [],
                playerStatsStartersAwayTeam: matchArray?.player_stats?.awayteam
                  ?.starters?.player
                  ? matchArray?.player_stats?.awayteam?.starters?.player
                  : [],
                playerStatsStartersHomeTeam: matchArray?.player_stats?.hometeam
                  ?.starters?.player
                  ? matchArray?.player_stats?.hometeam?.starters?.player
                  : [],
              };

              const teamIdAway: ITeamNBAModel | null | undefined =
                await TeamNBA.findOne({
                  goalServeTeamId: matchArray.awayteam.id,
                });
              if (teamIdAway) {
                data.awayTeamId = teamIdAway.id;
                data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
                  ? teamIdAway.goalServeTeamId
                  : 1;
              }
              const teamIdHome: ITeamNBAModel | null | undefined =
                await TeamNBA.findOne({
                  goalServeTeamId: matchArray.hometeam.id,
                });
              if (teamIdHome) {
                data.homeTeamId = teamIdHome.id;
                data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
                  ? teamIdHome.goalServeTeamId
                  : 1;
              }
              dataToStore.push(data);
            }
          }
        }

        if (dataToStore && dataToStore?.length > 0) {
          await NbaMatch.insertMany(dataToStore);
        }
      }
      return true;
    } catch (error: any) {
      console.log("error", error);
    }
  };
  public updateCurruntDateRecordNba = async () => {
    try {
      const getMatch = await axiosGet(
        `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-scores`,
        { json: true }
      );
      const matchArray = await getMatch?.data?.scores?.category?.match;
      const league: ILeagueModel | null = await League.findOne({
        goalServeLeagueId: getMatch?.data.scores.category.id,
      });
      if (matchArray?.length > 0 && matchArray) {
        // array logic
        for (let j = 0; j < matchArray?.length; j++) {
          const data: Partial<INbaMatchModel> = {
            leagueId: league?._id,
            goalServeLeagueId: league?.goalServeLeagueId,
            date: matchArray[j].date,
            formattedDate: matchArray[j].formatted_date,
            dateTimeUtc: matchArray[j].datetime_utc,
            timezone: matchArray[j].timezone,
            attendance: matchArray[j].attendance,
            goalServeMatchId: matchArray[j].id,
            status: matchArray[j].status,
            time: matchArray[j].time,
            timer: matchArray[j]?.timer ? matchArray[j]?.timer : "",
            goalServeVenueId: matchArray[j].venue_id,
            venueName: matchArray[j].venue_name,
            homeTeamTotalScore: matchArray[j].hometeam.totalscore,
            awayTeamTotalScore: matchArray[j].awayteam.totalscore,
            goalServeHomeTeamId: matchArray[j].hometeam.id,
            goalServeAwayTeamId: matchArray[j].awayteam.id,
            // new entries
            awayTeamOt: matchArray[j].awayteam.ot,
            awayTeamQ1: matchArray[j].awayteam.q1,
            awayTeamQ2: matchArray[j].awayteam.q2,
            awayTeamQ3: matchArray[j].awayteam.q3,
            awayTeamQ4: matchArray[j].awayteam.q4,
            awayTeamPosession: matchArray[j].awayteam.posession,

            homeTeamOt: matchArray[j].hometeam.ot,
            homeTeamQ1: matchArray[j].hometeam.q1,
            homeTeamQ2: matchArray[j].hometeam.q2,
            homeTeamQ3: matchArray[j].hometeam.q3,
            homeTeamQ4: matchArray[j].hometeam.q4,
            homeTeamPosession: matchArray[j].hometeam.posession,

            teamStatsHomeTeam: matchArray[j]?.team_stats?.hometeam
              ? matchArray[j]?.team_stats?.hometeam
              : {},
            teamStatsAwayTeam: matchArray[j]?.team_stats?.awayteam
              ? matchArray[j]?.team_stats?.awayteam
              : {},

            playerStatsBenchAwayTeam: matchArray[j]?.player_stats?.awayteam
              ?.bench?.player
              ? matchArray[j]?.player_stats?.awayteam?.bench?.player
              : [],
            playerStatsBenchHomeTeam: matchArray[j]?.player_stats?.hometeam
              ?.bench?.player
              ? matchArray[j]?.player_stats?.hometeam?.bench?.player
              : [],
            playerStatsStartersAwayTeam: matchArray[j]?.player_stats?.awayteam
              ?.starters?.player
              ? matchArray[j]?.player_stats?.awayteam?.starters?.player
              : [],
            playerStatsStartersHomeTeam: matchArray[j]?.player_stats?.hometeam
              ?.starters?.player
              ? matchArray[j]?.player_stats?.hometeam?.starters?.player
              : [],
          };
          const teamIdAway: ITeamNBAModel | null | undefined =
            await TeamNBA.findOne({
              goalServeTeamId: matchArray[j].awayteam.id,
            });

          data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 1;

          const teamIdHome: ITeamNBAModel | null | undefined =
            await TeamNBA.findOne({
              goalServeTeamId: matchArray[j].hometeam.id,
            });

          data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 1;
          await NbaMatch.findOneAndUpdate(
            { goalServeMatchId: data.goalServeMatchId },
            { $set: data },
            { new: true }
          );

          const regex = /^Final(.*)$/;
          if (
            matchArray[j].status != "Not Started" &&
            !regex.test(matchArray[j].status) &&
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
                leagueType: "NBA",
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
                leagueType: "NBA",
              },
              {
                status: "ACTIVE",
              }
            );
          } else if (regex.test(matchArray[j].status)) {
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
              "NBA"
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
                leagueType: "NBA",
              },
              {
                status: "CANCELED",
              }
            );
          }
        }
      } else {
        if (matchArray) {
          const data: Partial<INbaMatchModel> = {
            leagueId: league?._id,
            goalServeLeagueId: league?.goalServeLeagueId,
            date: matchArray.date,
            formattedDate: matchArray.formatted_date,
            dateTimeUtc: matchArray.datetime_utc,
            timezone: matchArray.timezone,
            attendance: matchArray.attendance,
            goalServeMatchId: matchArray.id,
            status: matchArray.status,
            time: matchArray.time,
            timer: matchArray?.timer ? matchArray?.timer : "",
            goalServeVenueId: matchArray.venue_id,
            venueName: matchArray.venue_name,
            homeTeamTotalScore: matchArray.hometeam.totalscore,
            awayTeamTotalScore: matchArray.awayteam.totalscore,
            goalServeHomeTeamId: matchArray.hometeam.id,
            goalServeAwayTeamId: matchArray.awayteam.id,
            // new entries
            awayTeamOt: matchArray.awayteam.ot,
            awayTeamQ1: matchArray.awayteam.q1,
            awayTeamQ2: matchArray.awayteam.q2,
            awayTeamQ3: matchArray.awayteam.q3,
            awayTeamQ4: matchArray.awayteam.q4,
            awayTeamPosession: matchArray.awayteam.posession,

            homeTeamOt: matchArray.hometeam.ot,
            homeTeamQ1: matchArray.hometeam.q1,
            homeTeamQ2: matchArray.hometeam.q2,
            homeTeamQ3: matchArray.hometeam.q3,
            homeTeamQ4: matchArray.hometeam.q4,
            homeTeamPosession: matchArray.hometeam.posession,

            teamStatsHomeTeam: matchArray?.team_stats?.hometeam
              ? matchArray?.team_stats?.hometeam
              : {},
            teamStatsAwayTeam: matchArray?.team_stats?.awayteam
              ? matchArray?.team_stats?.awayteam
              : {},

            playerStatsBenchAwayTeam: matchArray?.player_stats?.awayteam?.bench
              ?.player
              ? matchArray?.player_stats?.awayteam?.bench?.player
              : [],
            playerStatsBenchHomeTeam: matchArray?.player_stats?.hometeam?.bench
              ?.player
              ? matchArray?.player_stats?.hometeam?.bench?.player
              : [],
            playerStatsStartersAwayTeam: matchArray?.player_stats?.awayteam
              ?.starters?.player
              ? matchArray?.player_stats?.awayteam?.starters?.player
              : [],
            playerStatsStartersHomeTeam: matchArray?.player_stats?.hometeam
              ?.starters?.player
              ? matchArray?.player_stats?.hometeam?.starters?.player
              : [],
          };

          const teamIdAway: ITeamNBAModel | null | undefined =
            await TeamNBA.findOne({
              goalServeTeamId: matchArray.awayteam.id,
            });
          if (teamIdAway) {
            data.awayTeamId = teamIdAway.id;
            data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
              ? teamIdAway.goalServeTeamId
              : 1;
          }
          const teamIdHome: ITeamNBAModel | null | undefined =
            await TeamNBA.findOne({
              goalServeTeamId: matchArray.hometeam.id,
            });
          if (teamIdHome) {
            data.homeTeamId = teamIdHome.id;
            data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
              ? teamIdHome.goalServeTeamId
              : 1;
          }
          await NbaMatch.findOneAndUpdate(
            { goalServeMatchId: data.goalServeMatchId },
            { $set: data },
            { new: true }
          );
        }
        const regex = /^Final(.*)$/;
          if (
            matchArray.status != "Not Started" &&
            !regex.test(matchArray.status) &&
            matchArray.status != "Postponed" &&
            matchArray.status != "Canceled" &&
            matchArray.status != "Suspended"
          ) {
            const goalServeMatchId = matchArray.id;
            // expire not accepted bet requests
            await Bet.updateMany(
              {
                status: "PENDING",
                goalServeMatchId: goalServeMatchId,
                leagueType: "NBA",
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
                leagueType: "NBA",
              },
              {
                status: "ACTIVE",
              }
            );
          } else if (regex.test(matchArray.status)) {
            const homeTeamTotalScore = parseFloat(
              matchArray.hometeam.totalscore
            );
            const awayTeamTotalScore = parseFloat(
              matchArray.awayteam.totalscore
            );
            const goalServeMatchId = matchArray.id;
            const goalServeWinTeamId =
              homeTeamTotalScore > awayTeamTotalScore
                ? matchArray.hometeam.id
                : matchArray.awayteam.id;
            await declareResultMatch(
              parseInt(goalServeMatchId),
              parseInt(goalServeWinTeamId),
              "NBA"
            );
          } else if (
            matchArray.status == "Canceled" ||
            matchArray.status == "Postponed" ||
            matchArray.status == "Suspended"
          ) {
            const goalServeMatchId = matchArray.id;
            await Bet.updateMany(
              {
                status: "PENDING",
                goalServeMatchId: goalServeMatchId,
                leagueType: "NBA",
              },
              {
                status: "CANCELED",
              }
            );
          }
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };
  public updateNbaMatch = async () => {
    try {
      const getMatch = await axiosGet(
        `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-shedule`,
        { json: true }
      );
      // let matchesNeedToRemove = await NbaMatch.find({
      //   goalServeLeagueId: getMatch?.data?.shedules?.id,
      //   status: "Not Started",
      // }).lean();
      const matchArray = await getMatch?.data?.shedules?.matches;
      // const league: ILeagueModel | null = await League.findOne({
      //   goalServeLeagueId: getMatch?.data?.shedules?.id,
      // });
      for (let i = 0; i < matchArray?.length; i++) {
        for (let j = 0; j < matchArray[i]?.match?.length; j++) {
          // matchesNeedToRemove = await removeByAttr(
          //   matchesNeedToRemove,
          //   "goalServerMatchId",
          //   Number(matchArray[i]?.match[j]?.id)
          // );
          const match: INbaMatchModel | null = await NbaMatch.findOne({
            goalServeMatchId: matchArray[i]?.match[j]?.id,
          });
          // console.log("matchArray[i]?.match[j].formatted_date",matchArray[i]?.match[j].formatted_date)
          if (!match) {
            const data: Partial<INbaMatchModel> = {
              // leagueId: league?._id,
              goalServeLeagueId: getMatch?.data?.shedules?.id,
              date: matchArray[i]?.match[j].date,
              formattedDate: matchArray[i]?.match[j].formatted_date,
              timezone: matchArray[i]?.match[j].timezone,
              attendance: matchArray[i]?.match[j].attendance,
              goalServeMatchId: matchArray[i]?.match[j].id,
              dateTimeUtc: matchArray[i]?.match[j].datetime_utc,
              status: matchArray[i]?.match[j].status,
              time: matchArray[i]?.match[j].time,
              goalServeVenueId: matchArray[i]?.match[j].venue_id,
              venueName: matchArray[i]?.match[j].venue_name,
              homeTeamTotalScore: matchArray[i]?.match[j].hometeam.totalscore,
              awayTeamTotalScore: matchArray[i]?.match[j].awayteam.totalscore,
              goalServeHomeTeamId: matchArray[i]?.match[j].hometeam.id,
              goalServeAwayTeamId: matchArray[i]?.match[j].awayteam.id,
              // new entries
              timer: matchArray[i]?.match[j]?.timer
                ? matchArray[i]?.match[j]?.timer
                : "",
              awayTeamOt: matchArray[i]?.match[j].awayteam.ot,
              awayTeamQ1: matchArray[i]?.match[j].awayteam.q1,
              awayTeamQ2: matchArray[i]?.match[j].awayteam.q2,
              awayTeamQ3: matchArray[i]?.match[j].awayteam.q3,
              awayTeamQ4: matchArray[i]?.match[j].awayteam.q4,
              awayTeamPosession: matchArray[i]?.match[j].awayteam.posession,

              homeTeamOt: matchArray[i]?.match[j].hometeam.ot,
              homeTeamQ1: matchArray[i]?.match[j].hometeam.q1,
              homeTeamQ2: matchArray[i]?.match[j].hometeam.q2,
              homeTeamQ3: matchArray[i]?.match[j].hometeam.q3,
              homeTeamQ4: matchArray[i]?.match[j].hometeam.q4,
              homeTeamPosession: matchArray[i]?.match[j].hometeam.posession,

              teamStatsHomeTeam: matchArray[i]?.match[j]?.team_stats?.hometeam
                ? matchArray[i]?.match[j]?.team_stats?.hometeam
                : {},
              teamStatsAwayTeam: matchArray[i]?.match[j]?.team_stats?.awayteam
                ? matchArray[i]?.match[j]?.team_stats?.awayteam
                : {},

              playerStatsBenchAwayTeam: matchArray[i]?.match[j]?.player_stats
                ?.awayteam?.bench?.player
                ? matchArray[i]?.match[j]?.player_stats?.awayteam?.bench?.player
                : [],
              playerStatsBenchHomeTeam: matchArray[i]?.match[j]?.player_stats
                ?.hometeam?.bench?.player
                ? matchArray[i]?.match[j]?.player_stats?.hometeam?.bench?.player
                : [],
              playerStatsStartersAwayTeam: matchArray[i]?.match[j]?.player_stats
                ?.awayteam?.starters?.player
                ? matchArray[i]?.match[j]?.player_stats?.awayteam?.starters
                    ?.player
                : [],
              playerStatsStartersHomeTeam: matchArray[i]?.match[j]?.player_stats
                ?.hometeam?.starters?.player
                ? matchArray[i]?.match[j]?.player_stats?.hometeam?.starters
                    ?.player
                : [],
            };
            // const teamIdAway: ITeamNBAModel | null | undefined =
            //   await TeamNBA.findOne({
            //     goalServeTeamId: matchArray[i]?.match[j]?.awayteam.id,
            //   });

            data.goalServeAwayTeamId = matchArray[i]?.match[j]?.awayteam?.id
              ? matchArray[i]?.match[j]?.awayteam?.id
              : 1;

            // const teamIdHome: ITeamNBAModel | null | undefined =
            //   await TeamNBA.findOne({
            //     goalServeTeamId: matchArray[i]?.match[j]?.hometeam.id,
            //   });

            data.goalServeHomeTeamId = matchArray[i]?.match[j]?.hometeam?.id
              ? matchArray[i]?.match[j]?.hometeam?.id
              : 1;
            const matchData = new NbaMatch(data);
            await matchData.save();
          }
        }
      }
      // for (let k = 0; k < matchesNeedToRemove.length; k++) {
      //   const match = matchesNeedToRemove[k];
      //   await NbaMatch.deleteOne({
      //     goalServeMatchId: match.goalServeMatchId,
      //   });
      // }
      return true;
    } catch (error: any) {
      console.log("error", error);
    }
  };
  public addNbaPlayer = async () => {
    const teams = await TeamNBA.find();
    let data = {
      json: true,
    };
    if (teams.length > 0) {
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        const roasterApi = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          data,
          `bsktbl/${team.goalServeTeamId}_rosters`
        );
        let allRosterPlayers: Partial<INbaPlayerhModel>[] = [];
        if (roasterApi?.data?.team?.player) {
          let players: any = roasterApi?.data?.team?.player;
          if (players?.length) {
            for (let j = 0; j < players.length; j++) {
              const player: any = players[j];
              const PlayerData = {
                age: player.age,
                college: player.college,
                heigth: player.heigth,
                id: player.id,
                name: player.name,
                number: player.number,
                position: player.position,
                salary: player.salary,
                weigth: player.weigth,
                teamId: team.id,
                goalServeTeamId: team.goalServeTeamId,
                goalServePlayerId: player.id,
              };
              allRosterPlayers.push(PlayerData);
            }
          } else {
            allRosterPlayers.push({
              age: players.age,
              college: players.college,
              heigth: players.heigth,
              id: players.id,
              name: players.name,
              number: players.number,
              position: players.position,
              salary: players.salary,
              weigth: players.weigth,
              teamId: team.id,
              goalServeTeamId: team.goalServeTeamId,
              goalServePlayerId: players.id,
            });
          }
        }
        const statsApi = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          data,
          `bsktbl/${team.goalServeTeamId}_stats`
        );
        const allGamePlayer: any = [];
        const allShootingPlayer: any = [];
        if (statsApi?.data?.statistic?.category.length) {
          if (statsApi?.data?.statistic?.category[0].player.length) {
            const gamePlayers: any =
              statsApi?.data?.statistic?.category[0].player;
            for (let k = 0; k < gamePlayers.length; k++) {
              const gamePlayer = gamePlayers[k];
              const playerData = {
                isGamePlayer: true,
                game: {
                  assists_per_game: gamePlayer.assists_per_game,
                  blocks_per_game: gamePlayer.blocks_per_game,
                  defensive_rebounds_per_game:
                    gamePlayer.defensive_rebounds_per_game,
                  efficiency_rating: gamePlayer.efficiency_rating,
                  fouls_per_game: gamePlayer.fouls_per_game,
                  games_played: gamePlayer.games_played,
                  games_started: gamePlayer.games_started,
                  minutes: gamePlayer.minutes,
                  offensive_rebounds_per_game:
                    gamePlayer.offensive_rebounds_per_game,
                  points_per_game: gamePlayer.points_per_game,
                  rank: gamePlayer.rank,
                  rebounds_per_game: gamePlayer.rebounds_per_game,
                  steals_per_game: gamePlayer.steals_per_game,
                  turnovers_per_game: gamePlayer.turnovers_per_game,
                },
                teamId: team.id,
                goalServeTeamId: team.goalServeTeamId,
                goalServePlayerId: gamePlayer.id,
              };
              allGamePlayer.push(playerData);
            }
          } else {
            const gamePlayer: any =
              statsApi?.data?.statistic?.category[0].player;
            const playerData = {
              isGamePlayer: true,
              game: {
                assists_per_game: gamePlayer.assists_per_game,
                blocks_per_game: gamePlayer.blocks_per_game,
                defensive_rebounds_per_game:
                  gamePlayer.defensive_rebounds_per_game,
                efficiency_rating: gamePlayer.efficiency_rating,
                fouls_per_game: gamePlayer.fouls_per_game,
                games_played: gamePlayer.games_played,
                games_started: gamePlayer.games_started,
                minutes: gamePlayer.minutes,
                offensive_rebounds_per_game:
                  gamePlayer.offensive_rebounds_per_game,
                points_per_game: gamePlayer.points_per_game,
                rank: gamePlayer.rank,
                rebounds_per_game: gamePlayer.rebounds_per_game,
                steals_per_game: gamePlayer.steals_per_game,
                turnovers_per_game: gamePlayer.turnovers_per_game,
              },
              teamId: team.id,
              goalServeTeamId: team.goalServeTeamId,
              goalServePlayerId: gamePlayer.id,
            };
            allGamePlayer.push(playerData);
          }

          if (statsApi?.data?.statistic?.category[1].player.length) {
            const shootingPlayers: any =
              statsApi?.data?.statistic?.category[1].player;
            for (let l = 0; l < shootingPlayers.length; l++) {
              const shootingPlayer = shootingPlayers[l];
              const playerData = {
                isShootingPlayer: true,
                shooting: {
                  fg_attempts_per_game: shootingPlayer.fg_attempts_per_game,
                  fg_made_per_game: shootingPlayer.fg_made_per_game,
                  fg_pct: shootingPlayer.fg_pct,
                  field_goal_pct_avg: shootingPlayer.field_goal_pct_avg,
                  free_throws_attempts_per_game:
                    shootingPlayer.free_throws_attempts_per_game,
                  free_throws_made_per_game:
                    shootingPlayer.free_throws_made_per_game,
                  free_throws_pct: shootingPlayer.free_throws_pct,
                  points_per_shot: shootingPlayer.points_per_shot,
                  rank: shootingPlayer.rank,
                  three_point_attempts_per_game:
                    shootingPlayer.three_point_attempts_per_game,
                  three_point_made_per_game:
                    shootingPlayer.three_point_made_per_game,
                  three_point_pct: shootingPlayer.three_point_pct,
                  two_point_attemps_per_game:
                    shootingPlayer.two_point_attemps_per_game,
                  two_point_made_per_game:
                    shootingPlayer.two_point_made_per_game,
                  two_point_pct: shootingPlayer.two_point_pct,
                },
                teamId: team.id,
                goalServeTeamId: team.goalServeTeamId,
                goalServePlayerId: shootingPlayer.id,
              };
              allShootingPlayer.push(playerData);
            }
          } else {
            const shootingPlayer: any =
              statsApi?.data?.statistic?.category[1].player;
            const playerData = {
              isShootingPlayer: true,
              shooting: {
                fg_attempts_per_game: shootingPlayer.fg_attempts_per_game,
                fg_made_per_game: shootingPlayer.fg_made_per_game,
                fg_pct: shootingPlayer.fg_pct,
                field_goal_pct_avg: shootingPlayer.field_goal_pct_avg,
                free_throws_attempts_per_game:
                  shootingPlayer.free_throws_attempts_per_game,
                free_throws_made_per_game:
                  shootingPlayer.free_throws_made_per_game,
                free_throws_pct: shootingPlayer.free_throws_pct,
                points_per_shot: shootingPlayer.points_per_shot,
                rank: shootingPlayer.rank,
                three_point_attempts_per_game:
                  shootingPlayer.three_point_attempts_per_game,
                three_point_made_per_game:
                  shootingPlayer.three_point_made_per_game,
                three_point_pct: shootingPlayer.three_point_pct,
                two_point_attemps_per_game:
                  shootingPlayer.two_point_attemps_per_game,
                two_point_made_per_game: shootingPlayer.two_point_made_per_game,
                two_point_pct: shootingPlayer.two_point_pct,
              },
              teamId: team.id,
              goalServeTeamId: team.goalServeTeamId,
              goalServePlayerId: shootingPlayer.id,
            };
            allShootingPlayer.push(playerData);
          }
        }
        const mergedArray: INbaPlayerhModel[] | null = await mergeByPlayerId(
          allRosterPlayers,
          allGamePlayer,
          allShootingPlayer
        );
        for (let k = 0; k < mergedArray?.length; k++) {
          const player = mergedArray[k];
          await PlayersNBA.updateOne(
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
  public addNbaInjuredPlayer = async () => {
    const team = await TeamNBA.find();
    await Promise.all(
      team.map(async (item) => {
        let data = {
          json: true,
        };
        const injuryApi = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          data,
          `bsktbl/${item?.goalServeTeamId}_injuries`
        );
        const injuryArray1 = injuryApi?.data?.team;
        const existingPlayers = await NbaInjury.find({
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
          await NbaInjury.deleteMany({
            _id: { $in: extraEntries.map((player) => player._id) },
          });

          await Promise.all(
            injuryArray1?.report?.map(async (val: any) => {
              const player = await PlayersNBA.findOne({
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
              await NbaInjury.updateOne(
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
          await NbaInjury.deleteMany({
            _id: { $in: extraEntries.map((player) => player._id) },
          });
          const val = injuryArray1?.report;
          const player = await PlayersNBA.findOne({
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
          await NbaInjury.updateOne(
            {
              goalServeTeamId: data?.goalServeTeamId,
              goalServePlayerId: data?.goalServePlayerId,
            },
            { $set: data },
            { upsert: true }
          );
        } else {
          await NbaInjury.deleteMany({
            _id: { $in: existingPlayers.map((player) => player._id) },
          });
        }
      })
    );
  };
  public addNbaStandings = async () => {
    let data = {
      json: true,
    };
    const getstanding = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      "bsktbl/nba-standings"
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
                const teamId: ITeamNBAModel | null | undefined =
                  await TeamNBA.findOne({
                    goalServeTeamId: team.id,
                  });
                let data = {
                  leagueId: league?._id,
                  leagueType: item?.name,
                  goalServeLeagueId: getstanding?.data?.standings?.category?.id,
                  division: div?.name,
                  teamId: teamId?.id,
                  goalServeTeamId: teamId?.goalServeTeamId,
                  average_points_agains: team.average_points_agains,
                  average_points_for: team.average_points_for,
                  difference: team.difference,
                  gb: team.gb,
                  home_record: team.home_record,
                  last_10: team.last_10,
                  lost: team.lost,
                  name: team.name,
                  percentage: team.percentage,
                  position: team.position,
                  road_record: team.road_record,
                  streak: team.streak,
                  won: team.won,
                };
                await NbaStandings.findOneAndUpdate(
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
  public updateScoreSummary = async () => {
    try {
      let dataJson = {
        json: true,
      };
      let playByPlayData = await goalserveApi(
        "https://www.goalserve.com/getfeed",
        dataJson,
        `bsktbl/nba-playbyplay`
      );
      if (playByPlayData) {
        if (playByPlayData.data?.scores?.category?.match) {
          const matchData = playByPlayData.data?.scores?.category?.match;
          if (matchData && matchData.length > 0) {
            for (let i = 0; i < matchData.length; i++) {
              const match = matchData[i];
              let data = {
                goalServeLeagueId: playByPlayData.data?.scores?.category?.id,
                goalServeMatchId:
                  playByPlayData.data?.scores?.category?.match?.id,
                goalServeAwayTeamId: match?.hometeam.id,
                goalServeHomeTeamId: match?.awayteam.id,
                play: match?.playbyplay?.play,
              };
              await NbaScoreSummary.updateOne(
                {
                  goalServeLeagueId: data.goalServeLeagueId,
                  goalServeMatchId: data.goalServeMatchId,
                },
                { $set: data },
                { upsert: true }
              );
            }
          } else {
            const match = matchData;
            let data = {
              goalServeLeagueId: playByPlayData.data?.scores?.category?.id,
              goalServeMatchId:
                playByPlayData.data?.scores?.category?.match?.id,
              goalServeAwayTeamId: match?.hometeam.id,
              goalServeHomeTeamId: match?.awayteam.id,
              play: match?.playbyplay?.play,
            };
            await NbaScoreSummary.updateOne(
              {
                goalServeLeagueId: data.goalServeLeagueId,
                goalServeMatchId: data.goalServeMatchId,
              },
              { $set: data },
              { upsert: true }
            );
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
}
