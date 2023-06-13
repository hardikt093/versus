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
import socket from "../../services/socket.service";
import NbaOdds from "../../models/documents/NBA/odds.model";
import NbaScoreSummary from "../../models/documents/NBA/scoreSummary.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import INbaMatchModel from "../../models/interfaces/nbaMatch.interface";
import { INbaPlayerhModel } from "../../models/interfaces/nbaPlayer.interface";
import ITeamNBAModel from "../../models/interfaces/teamNBA.interface";
function removeByAttr(arr : any, attr : string, value: number){
  let i = arr.length;
  while(i--){
     if( arr[i] 
         && arr[i].hasOwnProperty(attr) 
         && (arguments.length > 2 && arr[i][attr] === value ) ){ 
         arr.splice(i,1);
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

const addNbaMatch = async () => {
  try {
    let getDaysArray = function (start: Date, end: Date) {
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
      new Date("2022-10-02"),
      new Date("2022-12-31")
    );
    for (let i = 0; i < daylist?.length; i++) {
      let dataToStore: Partial<INbaMatchModel>[] = [];
      let getMatch: any = {};
      try {
        getMatch = await axiosGet(
          `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-scores`,
          { json: true, date: daylist[i] }
        );
      } catch (error) {
        continue;
      }
      if (getMatch) {
        const matchArray = await getMatch?.data?.scores?.category?.match;
        const league: ILeagueModel | null = await League.findOne({
          goalServeLeagueId: getMatch?.data?.scores?.category?.id,
        }).lean();
        if (matchArray?.length > 0 && matchArray && league) {
          for (let j = 0; j < matchArray?.length; j++) {
            const data: Partial<INbaMatchModel> = {
              leagueId: league?._id,
              goalServeLeagueId: league?.goalServeLeagueId,
              date: matchArray[j]?.date,
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
              goalServeHomeTeamId: matchArray.hometeam.id,
              goalServeAwayTeamId: matchArray.awayteam.id,
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
      if (dataToStore && dataToStore.length > 0) {
        await NbaMatch.insertMany(dataToStore);
      }
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
};

const addMatchDataFutureForNba = async () => {
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

const updateCurruntDateRecordNba = async () => {
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

          playerStatsBenchAwayTeam: matchArray[j]?.player_stats?.awayteam?.bench
            ?.player
            ? matchArray[j]?.player_stats?.awayteam?.bench?.player
            : [],
          playerStatsBenchHomeTeam: matchArray[j]?.player_stats?.hometeam?.bench
            ?.player
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
    }
  } catch (error: any) {
    console.log("error", error);
  }
};

const addNbaPlayer = async () => {
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
          const gamePlayer: any = statsApi?.data?.statistic?.category[0].player;
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
                two_point_made_per_game: shootingPlayer.two_point_made_per_game,
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

const addNbaInjuredPlayer = async () => {
  // await NbaInjury.deleteMany({});
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
        await NbaInjury.deleteMany({_id: { $in: existingPlayers.map((player) => player._id)}});
      }
    })
  );
};

const addNbaStandings = async () => {
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

const getNbaStandingData = async () => {
  const getStandingData = await NbaStandings.aggregate([
    {
      $lookup: {
        from: "nbateamimages",
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
            average_points_agains: "$average_points_agains",
            average_points_for: "$average_points_for",
            difference: "$difference",
            gb: "$gb",
            home_record: "$home_record",
            last_ten: "$last_10",
            lost: "$lost",
            name: "$name",
            percentage: "$percentage",
            position: "$position",
            road_record: "$road_record",
            teamImage: "$images.image",
            streak: "$streak",
            won: "$won",
            pct: "$percentage",
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

const nbaScoreWithDate = async (date1: string, type: string) => {
  const date2 = moment(date1).add(24, "hours").utc().toISOString();

  const getUpcomingMatch = await NbaMatch.aggregate([
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
        from: "nbateams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nbateams",
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
        from: "nbastandings",
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
        from: "nbastandings",
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
        from: "nbateamimages",
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
        from: "nbateamimages",
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
        from: "nbaodds",
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
      $addFields: {
        odds: {
          $arrayElemAt: ["$odds", 0],
        },
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
          won: "$awayTeamStandings.won",
          lose: "$awayTeamStandings.lost",
          teamImage: "$awayTeamImage.image",
          goalServeAwayTeamId: "$goalServeAwayTeamId",
          spread: "$odds.awayTeamSpread.handicap",
          moneyline: {
            $cond: [
              { $gte: [{ $toDouble: "$odds.awayTeamMoneyline.us" }, 0] },
              { $concat: ["+", "$odds.awayTeamMoneyline.us"] },
              "$odds.awayTeamMoneyline.us",
            ],
          },
          total: "$odds.awayTeamTotal",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          homeTeamId: "$homeTeam._id",
          homeTeamErrors: "$homeTeamError",
          won: "$homeTeamStandings.won",
          lose: "$homeTeamStandings.lost",
          teamImage: "$homeTeamImage.image",
          goalServeHomeTeamId: "$goalServeHomeTeamId",
          moneyline: {
            $cond: [
              { $gte: [{ $toDouble: "$odds.homeTeamMoneyline.us" }, 0] },
              { $concat: ["+", "$odds.homeTeamMoneyline.us"] },
              "$odds.homeTeamMoneyline.us",
            ],
          },
          spread: "$odds.homeTeamSpread.handicap",
          total: "$odds.homeTeamTotal",
        },
      },
    },
  ]);

  const getFinalMatch = await NbaMatch.aggregate([
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
              $eq: "Final/OT",
            },
          },
          {
            status: {
              $eq: "Final/2OT",
            },
          },
          {
            status: {
              $regex: "^Final",
              $options: "i",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "nbateams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nbateams",
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
        from: "nbastandings",
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
        from: "nbastandings",
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
        from: "nbateamimages",
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
        from: "nbateamimages",
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
          awayTeamName: "$awayTeam.name",
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
          goalServeAwayTeamId: "$goalServeAwayTeamId",
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
          goalServeHomeTeamId: "$goalServeHomeTeamId",
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
const getLiveDataOfNba = async (date1: string) => {
  const date2 = moment(date1).add(24, "hours").utc().toISOString();

  const getLiveDataOfNba = await NbaMatch.aggregate([
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
        from: "nbateams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nbateams",
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
        from: "nbastandings",
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
        from: "nbastandings",
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
        from: "nbateamimages",
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
        from: "nbateamimages",
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
        datetime_utc: 1,
      },
    },
    {
      $project: {
        id: true,
        date: true,
        status: "$status",
        datetime_utc: "$dateTimeUtc",
        time: true,
        goalServeMatchId: true,
        timer: "$timer",
        awayTeam: {
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
          goalServeHomeTeamId: "$goalServeHomeTeamId",
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
  await socket("nbaLiveMatch", {
    getLiveDataOfNba,
  });
  return getLiveDataOfNba;
};
const nbaScoreWithCurrentDate = async (date1: string) => {
  return {
    getLiveMatch: await getLiveDataOfNba(date1),
    getUpcomingMatch: await nbaScoreWithDate(date1, "upcoming"),
    getFinalMatch: await nbaScoreWithDate(date1, "final"),
  };
};

const createAndUpdateOddsNba = async () => {
  let day = moment().format("D");
  let month = moment().format("MM");
  let year = moment().format("YYYY");
  let date = `${day}.${month}.${year}`;
  try {
    let data = { json: true, date1: date, showodds: "1", bm: "451," };
    const getScore = await goalserveApi(
      "http://www.goalserve.com/getfeed",
      data,
      "bsktbl/nba-shedule"
    );
    var matchData = getScore?.data?.shedules?.matches?.match;
    if (matchData?.length > 0) {
      await matchData?.map(async (item: any) => {
        if (item.status) {
          const league: ILeagueModel | null = await League.findOne({
            goalServeLeagueId: getScore?.data?.shedules?.id,
          });
          const findMatchOdds = await NbaOdds.find({
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
            };
            const oddsData = new NbaOdds(data);
            const savedOddsData = await oddsData.save();
          } else {
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
            };
            await NbaOdds.findOneAndUpdate(
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
        const findMatchOdds = await NbaOdds.find({
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
          };
          const oddsData = new NbaOdds(data);
          await oddsData.save();
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
          };
          await NbaOdds.findOneAndUpdate(
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

const createAndUpdateMatchOdds = async () => {
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
        const getMoneyLine: any = await getOdds("Home/Away", item?.odds?.type);
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

const nbaGetTeam = async (goalServeTeamId: string) => {
  const getTeam = await NbaStandings.aggregate([
    {
      $match: {
        goalServeTeamId: Number(goalServeTeamId),
      },
    },
    {
      $lookup: {
        from: "nbateamimages",
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
        from: "nbastandings",
        let: { parentDivision: "$division" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$division", "$$parentDivision"] },
            },
          },
          {
            $lookup: {
              from: "nbateamimages",
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
              percentage: true,
              gb: true,
              average_points_for: true,
              average_points_agains: true,
              difference: true,
              teamImage: { $arrayElemAt: ["$teamImage.image", 0] },
            },
          },
        ],
        as: "divisionStandings",
      },
    },

    {
      $lookup: {
        from: "nbainjuries",
        localField: "goalServeTeamId",
        foreignField: "goalServeTeamId",
        as: "teamInjuredPlayers",
      },
    },

    {
      $lookup: {
        from: "nbamatches",
        let: { goalServeTeamId: "$goalServeTeamId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $or: [
                      { $eq: ["$goalServeAwayTeamId", "$$goalServeTeamId"] },
                      { $eq: ["$goalServeHomeTeamId", "$$goalServeTeamId"] },
                    ],
                  },
                  { $eq: ["$status", "Final"] },
                ],
              },
            },
          },
          {
            $addFields: {
              opposingTeamId: {
                $cond: {
                  if: { $eq: ["$goalServeAwayTeamId", "$$goalServeTeamId"] },
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
            $sort: { dateUtc: -1 },
          },
          {
            $limit: 5,
          },
          {
            $lookup: {
              from: "nbateams",
              let: {
                opposingTeamId: "$opposingTeamId",
              },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$goalServeTeamId", "$$opposingTeamId"] },
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
                    from: "nbateamimages",
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
              from: "nbaodds",
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
                        then: "$homeTeamSpread.handicap",
                        else: "$awayTeamSpread.handicap",
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
        from: "nbaplayers",
        let: { goalServeTeamId: "$goalServeTeamId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$goalServeTeamId", "$$goalServeTeamId"] },
            },
          },
          {
            $addFields: {
              rebounds_per_game: { $toDouble: "$game.rebounds_per_game" },
              points_per_game: { $toDouble: "$game.points_per_game" },
              assists_per_game: { $toDouble: "$game.assists_per_game" },
              steals_per_game: { $toDouble: "$game.steals_per_game" },
              blocks_per_game: { $toDouble: "$game.blocks_per_game" },
            },
          },
          {
            $facet: {
              rebounds_per_game: [
                { $sort: { rebounds_per_game: -1 } },
                { $limit: 1 },
              ],
              points_per_game: [
                { $sort: { points_per_game: -1 } },
                { $limit: 1 },
              ],
              assists_per_game: [
                { $sort: { assists_per_game: -1 } },
                { $limit: 1 },
              ],
              steals_per_game: [
                { $sort: { steals_per_game: -1 } },
                { $limit: 1 },
              ],
              blocks_per_game: [
                { $sort: { blocks_per_game: -1 } },
                { $limit: 1 },
              ],
            },
          },
          {
            $project: {
              max_rebounds_per_game: {
                $arrayElemAt: ["$rebounds_per_game", 0],
              },
              max_points_per_game: { $arrayElemAt: ["$points_per_game", 0] },
              max_assists_per_game: { $arrayElemAt: ["$assists_per_game", 0] },
              max_steals_per_game: { $arrayElemAt: ["$steals_per_game", 0] },
              max_blocks_per_game: { $arrayElemAt: ["$blocks_per_game", 0] },
            },
          },
          {
            $project: {
              max_rebounds_per_game: {
                rebounds_per_game: "$max_rebounds_per_game.rebounds_per_game",
                name: "$max_rebounds_per_game.name",
              },
              max_points_per_game: {
                points_per_game: "$max_points_per_game.points_per_game",
                name: "$max_points_per_game.name",
              },
              max_assists_per_game: {
                assists_per_game: "$max_assists_per_game.assists_per_game",
                name: "$max_assists_per_game.name",
              },
              max_steals_per_game: {
                steals_per_game: "$max_steals_per_game.steals_per_game",
                name: "$max_steals_per_game.name",
              },
              max_blocks_per_game: {
                blocks_per_game: "$max_blocks_per_game.blocks_per_game",
                name: "$max_blocks_per_game.name",
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
        from: "nbaplayers",
        localField: "goalServeTeamId",
        foreignField: "goalServeTeamId",
        as: "teamPlayers",
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
        last_ten: "$last_10",
        streak: true,
        roaster: {
          $map: {
            input: "$teamPlayers",
            as: "item",
            in: {
              name: "$$item.name",
              salary: "$$item.salary",
              position: "$$item.position",
              goalServePlayerId: "$$item.goalServePlayerId",
              age: "$$item.age",
              heigth: "$$item.heigth",
              weigth: "$$item.weigth",
              college: "$$item.college",
            },
          },
        },
        playerSkatingStats: {
          allPlayerStats: {
            $map: {
              input: "$teamPlayers",
              as: "item",
              in: {
                games_played: "$$item.game.games_played",
                games_started: "$$item.game.games_started",
                minutes: "$$item.game.minutes",
                points: "$$item.game.points_per_game",
                offensive_rebounds_per_game:
                  "$$item.game.offensive_rebounds_per_game",
                defensive_rebounds_per_game:
                  "$$item.game.defensive_rebounds_per_game",
                rebounds_per_game: "$$item.game.rebounds_per_game",
                assists_per_game: "$$item.game.assists_per_game",
                steals_per_game: "$$item.game.steals_per_game",
                blocks_per_game: "$$item.game.blocks_per_game",
                turnovers_per_game: "$$item.game.turnovers_per_game",
                fouls_per_game: "$$item.game.fouls_per_game",
                name: "$$item.name",
                turnover_ratio: {
                  $cond: {
                    if: {
                      $eq: [{ $toDouble: "$$item.game.turnovers_per_game" }, 0],
                    },
                    then: 0, // or any other default value you want to assign
                    else: {
                      $round: [
                        {
                          $divide: [
                            { $toDouble: "$$item.game.assists_per_game" },
                            { $toDouble: "$$item.game.turnovers_per_game" },
                          ],
                        },
                        2,
                      ],
                    },
                  },
                },

                goalServePlayerId: "$$item.goalServePlayerId",
              },
            },
          },
          total: {
            name: "Total",
            games_played: {
              $max: {
                $map: {
                  input: "$teamPlayers",
                  as: "item",
                  in: {
                    $toDouble: "$$item.game.games_played", // Convert the string to an integer
                  },
                },
              },
            },

            points_per_game: {
              $sum: {
                $map: {
                  input: "$teamPlayers",
                  as: "item",
                  in: {
                    $toDouble: "$$item.game.points_per_game", // Convert the string to an integer
                  },
                },
              },
            },

            offensive_rebounds_per_game: {
              $sum: {
                $map: {
                  input: "$teamPlayers",
                  as: "item",
                  in: {
                    $toDouble: "$$item.game.offensive_rebounds_per_game", // Convert the string to an integer
                  },
                },
              },
            },

            defensive_rebounds_per_game: {
              $sum: {
                $map: {
                  input: "$teamPlayers",
                  as: "item",
                  in: {
                    $toDouble: "$$item.game.defensive_rebounds_per_game", // Convert the string to an integer
                  },
                },
              },
            },

            rebounds_per_game: {
              $sum: {
                $map: {
                  input: "$teamPlayers",
                  as: "item",
                  in: {
                    $toDouble: "$$item.game.rebounds_per_game", // Convert the string to an integer
                  },
                },
              },
            },

            steals_per_game: {
              $sum: {
                $map: {
                  input: "$teamPlayers",
                  as: "item",
                  in: {
                    $toDouble: "$$item.game.steals_per_game", // Convert the string to an integer
                  },
                },
              },
            },

            blocks_per_game: {
              $sum: {
                $map: {
                  input: "$teamPlayers",
                  as: "item",
                  in: {
                    $toDouble: "$$item.game.blocks_per_game", // Convert the string to an integer
                  },
                },
              },
            },
            turnovers_per_game: {
              $sum: {
                $map: {
                  input: "$teamPlayers",
                  as: "item",
                  in: {
                    $toDouble: "$$item.game.turnovers_per_game", // Convert the string to an integer
                  },
                },
              },
            },
            fouls_per_game: {
              $sum: {
                $map: {
                  input: "$teamPlayers",
                  as: "item",
                  in: {
                    $toDouble: "$$item.game.fouls_per_game", // Convert the string to an integer
                  },
                },
              },
            },
            turnover_ratio: {
              $sum: {
                $map: {
                  input: "$teamPlayers",
                  as: "item",
                  in: {
                    $cond: {
                      if: {
                        $eq: [
                          { $toDouble: "$$item.game.turnovers_per_game" },
                          0,
                        ],
                      },
                      then: 0, // or any other default value you want to assign
                      else: {
                        $round: [
                          {
                            $divide: [
                              { $toDouble: "$$item.game.assists_per_game" },
                              { $toDouble: "$$item.game.turnovers_per_game" },
                            ],
                          },
                          2,
                        ],
                      },
                    }, // Convert the string to an integer
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
                opposingTeam: { $arrayElemAt: ["$$item.opposingTeam", 0] },
                goalServeMatchId: "$$item.goalServeMatchId",
                date: "$$item.date",
                odds: { $arrayElemAt: ["$$item.odds", 0] },
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

  let standingData = await getNbaStandingData();
  getTeam[0].teamStandings = standingData;
  return getTeam[0];
};
const nbaSingleGameBoxScore = async (goalServeMatchId: string) => {
  const getMatch = await NbaMatch.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },
    {
      $lookup: {
        from: "nbateams",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeam",
      },
    },
    {
      $lookup: {
        from: "nbateams",
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
        from: "nbastandings",
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
        from: "nbastandings",
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
        from: "nbateamimages",
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
        from: "nbateamimages",
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
        from: "nbaodds",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "odds",
      },
    },
    {
      $addFields: {
        odds: {
          $arrayElemAt: ["$odds", 0],
        },
      },
    },
    {
      $lookup: {
        from: "nbaplayers",
        let: { homeTeamId: "$goalServeHomeTeamId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$goalServeTeamId", "$$homeTeamId"] },
                  { $eq: ["$isGamePlayer", true] },
                ],
              },
            },
          },
          {
            $project: {
              name: "$name",
              minutes: "$game.minutes",
              three_point_made_per_game: "$shooting.three_point_made_per_game",
              games_played: "$game.games_played",
              points_per_game: "$game.points_per_game",
              assists_per_game: "$game.assists_per_game",
              blocks_per_game: "$game.blocks_per_game",
              rebounds_per_game: "$game.rebounds_per_game",
            },
          },
        ],
        as: "homeTeamPlayersStatistic",
      },
    },
    {
      $lookup: {
        from: "nbaplayers",
        let: { awayTeamId: "$goalServeAwayTeamId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$goalServeTeamId", "$$awayTeamId"] },
                  { $eq: ["$isGamePlayer", true] },
                ],
              },
            },
          },
          {
            $project: {
              name: "$name",
              minutes: "$game.minutes",
              three_point_made_per_game: "$shooting.three_point_made_per_game",
              games_played: "$game.games_played",
              points_per_game: "$game.points_per_game",
              assists_per_game: "$game.assists_per_game",
              blocks_per_game: "$game.blocks_per_game",
              rebounds_per_game: "$game.rebounds_per_game",
            },
          },
        ],
        as: "awayTeamPlayersStatistic",
      },
    },
    {
      $addFields: {
        mergePlayersAwayTeam: {
          $concatArrays: [
            "$playerStatsBenchAwayTeam",
            "$playerStatsStartersAwayTeam",
          ],
        },
      },
    },
    {
      $addFields: {
        mergePlayersHomeTeam: {
          $concatArrays: [
            "$playerStatsBenchHomeTeam",
            "$playerStatsStartersHomeTeam",
          ],
        },
      },
    },
    {
      $addFields: {
        topPlayerHomeTeam: {
          $reduce: {
            input: "$mergePlayersAwayTeam",
            initialValue: { points: 0 },
            in: {
              $cond: [
                {
                  $gte: [
                    { $toDouble: "$$this.points" },
                    { $toDouble: "$$value.points" },
                  ],
                },
                "$$this",
                "$$value",
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        topPlayerAwayTeam: {
          $reduce: {
            input: "$mergePlayersHomeTeam",
            initialValue: { points_per_game: 0 },
            in: {
              $cond: [
                {
                  $gte: [
                    { $toDouble: "$$this.points" },
                    { $toDouble: "$$value.points" },
                  ],
                },
                "$$this",
                "$$value",
              ],
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: "nbascoresummaries",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "scoreSummary",
      },
    },

    {
      $project: {
        scoringSummary: [
          {
            title: "1st Quarter",
            child: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: { $arrayElemAt: ["$scoreSummary.play", 0] },
                    as: "play",
                    cond: { $eq: ["$$play.period", "1st Quarter"] },
                  },
                },
                -1,
              ],
            },
          },
          {
            title: "2nd Quarter",
            child: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: { $arrayElemAt: ["$scoreSummary.play", 0] },
                    as: "play",
                    cond: { $eq: ["$$play.period", "2nd Quarter"] },
                  },
                },
                -1,
              ],
            },
          },
          {
            title: "3rd Quarter",
            child: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: { $arrayElemAt: ["$scoreSummary.play", 0] },
                    as: "play",
                    cond: { $eq: ["$$play.period", "3rd Quarter"] },
                  },
                },
                -1,
              ],
            },
          },
          {
            title: "4th Quarter",
            child: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: { $arrayElemAt: ["$scoreSummary.play", 0] },
                    as: "play",
                    cond: { $eq: ["$$play.period", "4th Quarter"] },
                  },
                },
                -1,
              ],
            },
          },
        ],
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
        scoring: {
          awayTeam: [
            {
              title: "Quater 1",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ1", "0"] },
                  then: "-",
                  else: "$awayTeamQ1",
                },
              },
            },
            {
              title: "Quater 2",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ2", "0"] },
                  then: "-",
                  else: "$awayTeamQ2",
                },
              },
            },
            {
              title: "Quater 3",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ3", "0"] },
                  then: "-",
                  else: "$awayTeamQ3",
                },
              },
            },
            {
              title: "Quater 4",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ4", "0"] },
                  then: "-",
                  else: "$awayTeamQ4",
                },
              },
            },
            {
              title: "Total",
              score: "$awayTeamTotalScoreInNumber",
            },
          ],

          homeTeam: [
            {
              title: "Quater 1",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ1", "0"] },
                  then: "-",
                  else: "$homeTeamQ1",
                },
              },
            },
            {
              title: "Quater 2",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ2", "0"] },
                  then: "-",
                  else: "$homeTeamQ2",
                },
              },
            },
            {
              title: "Quater 3",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ3", "0"] },
                  then: "-",
                  else: "$homeTeamQ3",
                },
              },
            },
            {
              title: "Quater 4",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ4", "0"] },
                  then: "-",
                  else: "$homeTeamQ4",
                },
              },
            },
            {
              title: "Total",
              score: "$homeTeamTotalScoreInNumber",
            },
          ],
        },
        teamStatistic: {
          homeTeam: {
            field_goals_made_total: "$teamStatsHomeTeam.field_goals_made.total",
            field_goals_made_pct: "$teamStatsHomeTeam.field_goals_made.pct",
            threepoint_goals_made_total:
              "$teamStatsHomeTeam.threepoint_goals_made.total",
            threepoint_goals_made_pct:
              "$teamStatsHomeTeam.threepoint_goals_made.pct",
            freethrows_goals_made_total:
              "$teamStatsHomeTeam.freethrows_goals_made.total",
            freethrows_goals_made_pct:
              "$teamStatsHomeTeam.freethrows_goals_made.pct",
            assists: "$teamStatsHomeTeam.assists.total",
            rebounds_total: "$teamStatsHomeTeam.rebounds.total",
            steals: "$teamStatsHomeTeam.steals.total",
            blocks: "$teamStatsHomeTeam.blocks.total",
            turnovers_total: "$teamStatsHomeTeam.turnovers.total",
            personal_fouls_total: "$teamStatsHomeTeam.personal_fouls.total",
          },
          awayTeam: {
            field_goals_made_total: "$teamStatsAwayTeam.field_goals_made.total",
            field_goals_made_pct: "$teamStatsAwayTeam.field_goals_made.pct",
            threepoint_goals_made_total:
              "$teamStatsAwayTeam.threepoint_goals_made.total",
            threepoint_goals_made_pct:
              "$teamStatsAwayTeam.threepoint_goals_made.pct",
            freethrows_goals_made_total:
              "$teamStatsAwayTeam.freethrows_goals_made.total",
            freethrows_goals_made_pct:
              "$teamStatsAwayTeam.freethrows_goals_made.pct",
            assists: "$teamStatsAwayTeam.assists.total",
            rebounds_total: "$teamStatsAwayTeam.rebounds.total",
            steals: "$teamStatsAwayTeam.steals.total",
            blocks: "$teamStatsAwayTeam.blocks.total",
            turnovers_total: "$teamStatsAwayTeam.turnovers.total",
            personal_fouls_total: "$teamStatsAwayTeam.personal_fouls.total",
          },
        },
        topPlayers: {
          homeTeam: "$topPlayerHomeTeam",
          awayTeam: "$topPlayerAwayTeam",
        },
        playersStatistic: {
          homeTeam: "$mergePlayersHomeTeam",
          awayTeam: "$mergePlayersAwayTeam",
        },
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
          homeTeamSpread: "$odds.homeTeamSpread.handicap",
          awayTeamSpread: "$odds.awayTeamSpread.handicap",
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

const updateNbaMatch = async () => {
  try {
    const getMatch = await axiosGet(
      `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-shedule`,
      { json: true }
    );
    let matchesNeedToRemove = await NbaMatch.find({
      goalServeLeagueId: getMatch?.data?.shedules?.id,
      "status" : "Not Started"
    }).lean();
    const matchArray = await getMatch?.data?.shedules?.matches;
    const league: ILeagueModel | null = await League.findOne({
      goalServeLeagueId: getMatch?.data?.shedules?.id,
    });
    for (let i = 0; i < matchArray?.length; i++) {
      for (let j = 0; j < matchArray[i]?.match?.length; j++) {
        matchesNeedToRemove = await removeByAttr(matchesNeedToRemove, 'goalServerMatchId', Number(matchArray[i]?.match[j]?.id))
        const match: INbaMatchModel | null = await NbaMatch.findOne({
          goalServeMatchId: matchArray[i]?.match[j]?.id,
        });
        if (!match) {
          const data: Partial<INbaMatchModel> = {
            leagueId: league?._id,
            goalServeLeagueId: league?.goalServeLeagueId,
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
          const teamIdAway: ITeamNBAModel | null | undefined =
            await TeamNBA.findOne({
              goalServeTeamId: matchArray[i]?.match[j]?.awayteam.id,
            });

          data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 1;

          const teamIdHome: ITeamNBAModel | null | undefined =
            await TeamNBA.findOne({
              goalServeTeamId: matchArray[i]?.match[j]?.hometeam.id,
            });

          data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 1;
          const matchData = new NbaMatch(data);
          await matchData.save();
        }
      }
    }
    for (let k = 0; k < matchesNeedToRemove.length; k++) {
      const match = matchesNeedToRemove[k];
      await NbaMatch.deleteOne({
        goalServeMatchId : match.goalServeMatchId
      });
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
};

const getUpcommingMatchNba = async () => {
  try {
    let curruntDay = moment().startOf("day").utc().toISOString();
    let subtractOneDay = moment(curruntDay)
      .subtract(12, "hours")
      .utc()
      .toISOString();
    let addOneDay = moment(curruntDay).add(38, "hours").utc().toISOString();
    const getUpcomingMatch = await NbaMatch.aggregate([
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
          from: "nbateams",
          localField: "goalServeAwayTeamId",
          foreignField: "goalServeTeamId",
          as: "awayTeam",
        },
      },
      {
        $lookup: {
          from: "nbateams",
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
          from: "nbastandings",
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
          from: "nbastandings",
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
          from: "nbateamimages",
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
          from: "nbateamimages",
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
          from: "nbaodds",
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
        $addFields: {
          odds: {
            $arrayElemAt: ["$odds", 0],
          },
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
            won: "$awayTeamStandings.won",
            lose: "$awayTeamStandings.lost",
            teamImage: "$awayTeamImage.image",
            goalServeAwayTeamId: "$goalServeAwayTeamId",
            moneyline: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.awayTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.awayTeamMoneyline.us"] },
                "$odds.awayTeamMoneyline.us",
              ],
            },
            spread: "$odds.awayTeamSpread.handicap",

            total: "$odds.awayTeamTotal",
          },
          homeTeam: {
            homeTeamName: "$homeTeam.name",
            homeTeamId: "$homeTeam._id",
            homeTeamErrors: "$homeTeamError",
            won: "$homeTeamStandings.won",
            lose: "$homeTeamStandings.lost",
            teamImage: "$homeTeamImage.image",
            goalServeHomeTeamId: "$goalServeHomeTeamId",
            moneyline: {
              $cond: [
                { $gte: [{ $toDouble: "$odds.homeTeamMoneyline.us" }, 0] },
                { $concat: ["+", "$odds.homeTeamMoneyline.us"] },
                "$odds.homeTeamMoneyline.us",
              ],
            },
            spread: "$odds.homeTeamSpread.handicap",

            total: "$odds.homeTeamTotal",
          },
        },
      },
    ]);
    await socket("nbaUpcomingMatch", {
      getUpcomingMatch,
    });
    return getUpcomingMatch;
  } catch (error: any) {}
};

const getFinalMatchNba = async () => {
  try {
    let curruntDay = moment().startOf("day").utc().toISOString();
    let subtractOneDay = moment(curruntDay)
      .subtract(12, "hours")
      .utc()
      .toISOString();
    let addOneDay = moment(curruntDay).add(38, "hours").utc().toISOString();
    const getFinalMatch = await NbaMatch.aggregate([
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
                $eq: "Final/OT",
              },
            },
            {
              status: {
                $eq: "Final/2OT",
              },
            },
            {
              status: {
                $eq: "Final/4OT",
              },
            },
            {
              status: {
                $regex: "^Final",
                $options: "i",
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "nbateams",
          localField: "goalServeAwayTeamId",
          foreignField: "goalServeTeamId",
          as: "awayTeam",
        },
      },
      {
        $lookup: {
          from: "nbateams",
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
          from: "nbastandings",
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
          from: "nbastandings",
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
          from: "nbateamimages",
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
          from: "nbateamimages",
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
            goalServeAwayTeamId: "$goalServeAwayTeamId",
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
            goalServeHomeTeamId: "$goalServeHomeTeamId",
          },
        },
      },
    ]);
    await socket("nbaFinalMatch", {
      getFinalMatch,
    });
    return getFinalMatch;
  } catch (error: any) {}
};
const nbaSingleGameBoxScoreUpcomming = async (goalServeMatchId: string) => {
  const getMatch = await NbaMatch.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },
    {
      $lookup: {
        from: "nbateams",
        let: {
          awayTeamId: "$goalServeAwayTeamId",
          homeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$goalServeTeamId", ["$$awayTeamId", "$$homeTeamId"]],
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
        as: "teams",
      },
    },

    {
      $lookup: {
        from: "nbastandings",
        let: {
          awayTeamId: "$goalServeAwayTeamId",
          homeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$goalServeTeamId", ["$$awayTeamId", "$$homeTeamId"]],
              },
            },
          },
          {
            $project: {
              goalServeTeamId: 1,
              won: 1,
              lost: 1,
              average_points_for: 1,
              average_points_agains: 1,
            },
          },
        ],
        as: "standings",
      },
    },
    {
      $lookup: {
        from: "nbateamimages",
        let: {
          awayTeamId: "$goalServeAwayTeamId",
          homeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$goalServeTeamId", ["$$awayTeamId", "$$homeTeamId"]],
              },
            },
          },
          {
            $project: {
              goalServeTeamId: 1,
              image: 1,
            },
          },
        ],
        as: "teamImages",
      },
    },

    {
      $addFields: {
        awayTeam: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$teams",
                cond: {
                  $eq: ["$$this.goalServeTeamId", "$goalServeAwayTeamId"],
                },
              },
            },
            0,
          ],
        },
        homeTeam: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$teams",
                cond: {
                  $eq: ["$$this.goalServeTeamId", "$goalServeHomeTeamId"],
                },
              },
            },
            0,
          ],
        },

        awayTeamStandings: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$standings",
                cond: {
                  $eq: ["$$this.goalServeTeamId", "$goalServeAwayTeamId"],
                },
              },
            },
            0,
          ],
        },
        homeTeamStandings: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$standings",
                cond: {
                  $eq: ["$$this.goalServeTeamId", "$goalServeHomeTeamId"],
                },
              },
            },
            0,
          ],
        },
        awayTeamImage: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$teamImages",
                cond: {
                  $eq: ["$$this.goalServeTeamId", "$goalServeAwayTeamId"],
                },
              },
            },
            0,
          ],
        },
        homeTeamImage: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$teamImages",
                cond: {
                  $eq: ["$$this.goalServeTeamId", "$goalServeHomeTeamId"],
                },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $lookup: {
        from: "nbainjuries",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamInjuredPlayers",
      },
    },
    {
      $lookup: {
        from: "nbainjuries",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamInjuredPlayers",
      },
    },
    {
      $lookup: {
        from: "nbaplayers",
        let: {
          awayTeamId: "$goalServeAwayTeamId",
          homeTeamId: "$goalServeHomeTeamId",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$goalServeTeamId", ["$$awayTeamId", "$$homeTeamId"]],
              },
            },
          },
        ],
        as: "players",
      },
    },
    {
      $lookup: {
        from: "nbaodds",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "odds",
      },
    },
    {
      $addFields: {
        odds: {
          $arrayElemAt: ["$odds", 0],
        },
      },
    },
    {
      $lookup: {
        from: "nbaodds",
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
        awayTeamFullName: "$awayTeam.name",
        homeTeamFullName: "$homeTeam.name",
        awayTeamAbbreviation: "$awayTeam.abbreviation",
        homeTeamAbbreviation: "$homeTeam.abbreviation",
        homeTeamImage: "$homeTeamImage.image",
        awayTeamImage: "$awayTeamImage.image",
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
                    name: "$$player.name",
                    goalServePlayerId: "$$player.goalServePlayerId",
                    goalServeTeamId: "$$player.goalServeTeamId",
                    number: "$$player.number",
                    games_played: "$$player.game.games_played",
                    points_per_game: "$$player.game.points_per_game",
                    assists_per_game: "$$player.game.assists_per_game",
                    blocks_per_game: "$$player.game.blocks_per_game",
                    rebounds_per_game: "$$player.game.rebounds_per_game",
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
                    name: "$$player.name",
                    goalServePlayerId: "$$player.goalServePlayerId",
                    goalServeTeamId: "$$player.goalServeTeamId",
                    number: "$$player.number",
                    games_played: "$$player.game.games_played",
                    points_per_game: "$$player.game.points_per_game",
                    assists_per_game: "$$player.game.assists_per_game",
                    blocks_per_game: "$$player.game.blocks_per_game",
                    rebounds_per_game: "$$player.game.rebounds_per_game",
                  },
                ],
              },
            },
          },
        },
        awayTeam: {
          awayTeamName: "$awayTeam.name",
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
          spread: "$odds.awayTeamSpread.handicap",
          total: "$odds.awayTeamTotal",
        },
        homeTeam: {
          homeTeamName: "$homeTeam.name",
          goalServeHomeTeamId: "$homeTeam.goalServeTeamId",
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
          spread: "$odds.homeTeamSpread.handicap",
          total: "$odds.homeTeamTotal",
        },
        teamStatistics: [
          {
            title: "Wins",
            homeTeam: "$homeTeamStandings.won",
            awayTeam: "$awayTeamStandings.won",
            total: {
              $add: [
                {
                  $toInt: "$awayTeamStandings.won",
                },
                {
                  $toInt: "$homeTeamStandings.won",
                },
              ],
            },
          },
          {
            title: "Points For",
            homeTeam: "$homeTeamStandings.average_points_for",
            awayTeam: "$awayTeamStandings.average_points_for",
            total: {
              $add: [
                {
                  $toDouble: "$awayTeamStandings.average_points_for",
                },
                {
                  $toDouble: "$homeTeamStandings.average_points_for",
                },
              ],
            },
          },
          {
            title: "Points Against",
            homeTeam: "$homeTeamStandings.average_points_agains",
            awayTeam: "$awayTeamStandings.average_points_agains",
            total: {
              $add: [
                {
                  $toDouble: "$homeTeamStandings.average_points_agains",
                },
                {
                  $toDouble: "$awayTeamStandings.average_points_agains",
                },
              ],
            },
          },
          {
            title: "Losses",
            homeTeam: "$homeTeamStandings.lost",
            awayTeam: "$awayTeamStandings.lost",
            total: {
              $add: [
                {
                  $toInt: "$homeTeamStandings.lost",
                },
                {
                  $toInt: "$awayTeamStandings.lost",
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
          homeTeamSpread: "$closingOdds.homeTeamSpread.handicap",
          awayTeamSpread: "$closingOdds.awayTeamSpread.handicap",
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

const nbaSingleGameScoreLive = async (goalServeMatchId: string) => {
  const getMatch = await NbaMatch.aggregate([
    {
      $match: {
        goalServeMatchId: Number(goalServeMatchId),
      },
    },
    {
      $lookup: {
        from: "nbateams",
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
        from: "nbateamimages",
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
        from: "nbastandings",
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
                    won: 1,
                    lost: 1,
                    percentage: 1,
                    last_10: 1,
                    streak: 1,
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
                    won: 1,
                    lost: 1,
                    percentage: 1,
                    last_10: 1,
                    streak: 1,
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
        awayTeamPlayerStats: {
          $concatArrays: [
            "$playerStatsBenchAwayTeam",
            "$playerStatsStartersAwayTeam",
          ],
        },
        homeTeamPlayerStats: {
          $concatArrays: [
            "$playerStatsBenchHomeTeam",
            "$playerStatsStartersHomeTeam",
          ],
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
        from: "nbainjuries",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamInjuredPlayers",
      },
    },
    {
      $lookup: {
        from: "nbainjuries",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamInjuredPlayers",
      },
    },
    {
      $lookup: {
        from: "nbaodds",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "odds",
      },
    },
    {
      $addFields: {
        odds: {
          $arrayElemAt: ["$odds", 0],
        },
      },
    },

    {
      $project: {
        id: 1,
        attendance: 1,
        status: "$status",
        venueName: 1,
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
        timer: "$timer",
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
        playerStatistics: {
          homeTeam: {
            $map: {
              input: "$homeTeamPlayerStats",
              as: "item",
              in: {
                minutes: "$$item.minutes",
                threepoint_goals_made: "$$item.threepoint_goals_made",
                goalServePlayerId: "$$item.goalServePlayerId",
                playerName: "$$item.name",
                points: "$$item.points",
                assists: "$$item.assists",
                blocks: "$$item.blocks",
              },
            },
          },
          awayTeam: {
            $map: {
              input: "$awayTeamPlayerStats",
              as: "item",
              in: {
                minutes: "$$item.minutes",
                threepoint_goals_made: "$$item.threepoint_goals_made",
                goalServePlayerId: "$$item.goalServePlayerId",
                playerName: "$$item.name",
                points: "$$item.points",
                assists: "$$item.assists",
                blocks: "$$item.blocks",
              },
            },
          },
        },
        startingPlayers: {
          awayTeam: {
            $map: {
              input: "$playerStatsStartersAwayTeam",
              as: "item",
              in: {
                playerName: "$$item.name",
                points: "$$item.points",
              },
            },
          },
          homeTeam: {
            $map: {
              input: "$playerStatsStartersHomeTeam",
              as: "item",
              in: {
                playerName: "$$item.name",
                points: "$$item.points",
              },
            },
          },
        },
        teamStatistics: {
          homeTeam: {
            points: "$homeTeamTotalScore",
            name: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            assists: "$teamStatsHomeTeam.assists.total",
            rebounds: "$teamStatsHomeTeam.rebounds.total",
            fouls: "$teamStatsHomeTeam.personal_fouls.total",
            field_goals_made: "$teamStatsHomeTeam.field_goals_made.total",
            threepoint_goals_made:
              "$teamStatsHomeTeam.threepoint_goals_made.total",
          },
          awayTeam: {
            points: "$awayTeamTotalScore",
            name: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            assists: "$teamStatsAwayTeam.assists.total",
            rebounds: "$teamStatsAwayTeam.rebounds.total",
            fouls: "$teamStatsAwayTeam.personal_fouls.total",
            field_goals_made: "$teamStatsAwayTeam.field_goals_made.total",
            threepoint_goals_made:
              "$teamStatsAwayTeam.threepoint_goals_made.total",
          },
        },
        scoring: {
          awayTeam: [
            {
              title: "Quater 1",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ1", "0"] },
                  then: "-",
                  else: "$awayTeamQ1",
                },
              },
            },
            {
              title: "Quater 2",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ2", "0"] },
                  then: "-",
                  else: "$awayTeamQ2",
                },
              },
            },
            {
              title: "Quater 3",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ3", "0"] },
                  then: "-",
                  else: "$awayTeamQ3",
                },
              },
            },
            {
              title: "Quater 4",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ4", "0"] },
                  then: "-",
                  else: "$awayTeamQ4",
                },
              },
            },
            {
              title: "Total",
              score: "$awayTeamTotalScoreInNumber",
            },
          ],

          homeTeam: [
            {
              title: "Quater 1",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ1", "0"] },
                  then: "-",
                  else: "$homeTeamQ1",
                },
              },
            },
            {
              title: "Quater 2",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ2", "0"] },
                  then: "-",
                  else: "$homeTeamQ2",
                },
              },
            },
            {
              title: "Quater 3",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ3", "0"] },
                  then: "-",
                  else: "$homeTeamQ3",
                },
              },
            },
            {
              title: "Quater 4",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ4", "0"] },
                  then: "-",
                  else: "$homeTeamQ4",
                },
              },
            },
            {
              title: "Total",
              score: "$homeTeamTotalScoreInNumber",
            },
          ],
        },
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
          homeTeamSpread: "$odds.homeTeamSpread.handicap",
          awayTeamSpread: "$odds.awayTeamSpread.handicap",
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
const liveBoxscoreNBA = async (date1: string) => {
  const date2 = moment(date1).add(48, "hours").utc().toISOString();
  const getMatch = await NbaMatch.aggregate([
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
        from: "nbateams",
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
        from: "nbateamimages",
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
        from: "nbastandings",
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
                    won: 1,
                    lost: 1,
                    percentage: 1,
                    last_10: 1,
                    streak: 1,
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
                    won: 1,
                    lost: 1,
                    percentage: 1,
                    last_10: 1,
                    streak: 1,
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
        awayTeamPlayerStats: {
          $concatArrays: [
            "$playerStatsBenchAwayTeam",
            "$playerStatsStartersAwayTeam",
          ],
        },
        homeTeamPlayerStats: {
          $concatArrays: [
            "$playerStatsBenchHomeTeam",
            "$playerStatsStartersHomeTeam",
          ],
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
        from: "nbainjuries",
        localField: "goalServeHomeTeamId",
        foreignField: "goalServeTeamId",
        as: "homeTeamInjuredPlayers",
      },
    },
    {
      $lookup: {
        from: "nbainjuries",
        localField: "goalServeAwayTeamId",
        foreignField: "goalServeTeamId",
        as: "awayTeamInjuredPlayers",
      },
    },
    {
      $lookup: {
        from: "nbaodds",
        localField: "goalServeMatchId",
        foreignField: "goalServeMatchId",
        as: "odds",
      },
    },
    {
      $addFields: {
        odds: {
          $arrayElemAt: ["$odds", 0],
        },
      },
    },

    {
      $project: {
        id: 1,
        attendance: 1,
        status: "$status",
        venueName: 1,
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
        timer: "$timer",
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
        playerStatistics: {
          homeTeam: {
            $map: {
              input: "$homeTeamPlayerStats",
              as: "item",
              in: {
                minutes: "$$item.minutes",
                threepoint_goals_made: "$$item.threepoint_goals_made",
                goalServePlayerId: "$$item.goalServePlayerId",
                playerName: "$$item.name",
                points: "$$item.points",
                assists: "$$item.assists",
                blocks: "$$item.blocks",
              },
            },
          },
          awayTeam: {
            $map: {
              input: "$awayTeamPlayerStats",
              as: "item",
              in: {
                minutes: "$$item.minutes",
                threepoint_goals_made: "$$item.threepoint_goals_made",
                goalServePlayerId: "$$item.goalServePlayerId",
                playerName: "$$item.name",
                points: "$$item.points",
                assists: "$$item.assists",
                blocks: "$$item.blocks",
              },
            },
          },
        },
        startingPlayers: {
          awayTeam: {
            $map: {
              input: "$playerStatsStartersAwayTeam",
              as: "item",
              in: {
                playerName: "$$item.name",
                points: "$$item.points",
              },
            },
          },
          homeTeam: {
            $map: {
              input: "$playerStatsStartersHomeTeam",
              as: "item",
              in: {
                playerName: "$$item.name",
                points: "$$item.points",
              },
            },
          },
        },
        teamStatistics: {
          homeTeam: {
            points: "$homeTeamTotalScore",
            name: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            assists: "$teamStatsHomeTeam.assists.total",
            rebounds: "$teamStatsHomeTeam.rebounds.total",
            fouls: "$teamStatsHomeTeam.personal_fouls.total",
            field_goals_made: "$teamStatsHomeTeam.field_goals_made.total",
            threepoint_goals_made:
              "$teamStatsHomeTeam.threepoint_goals_made.total",
          },
          awayTeam: {
            points: "$awayTeamTotalScore",
            name: { $arrayElemAt: ["$teams.homeTeam.name", 0] },
            assists: "$teamStatsAwayTeam.assists.total",
            rebounds: "$teamStatsAwayTeam.rebounds.total",
            fouls: "$teamStatsAwayTeam.personal_fouls.total",
            field_goals_made: "$teamStatsAwayTeam.field_goals_made.total",
            threepoint_goals_made:
              "$teamStatsAwayTeam.threepoint_goals_made.total",
          },
        },
        scoring: {
          awayTeam: [
            {
              title: "Quater 1",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ1", "0"] },
                  then: "-",
                  else: "$awayTeamQ1",
                },
              },
            },
            {
              title: "Quater 2",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ2", "0"] },
                  then: "-",
                  else: "$awayTeamQ2",
                },
              },
            },
            {
              title: "Quater 3",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ3", "0"] },
                  then: "-",
                  else: "$awayTeamQ3",
                },
              },
            },
            {
              title: "Quater 4",
              score: {
                $cond: {
                  if: { $eq: ["$awayTeamQ4", "0"] },
                  then: "-",
                  else: "$awayTeamQ4",
                },
              },
            },
            {
              title: "Total",
              score: "$awayTeamTotalScoreInNumber",
            },
          ],

          homeTeam: [
            {
              title: "Quater 1",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ1", "0"] },
                  then: "-",
                  else: "$homeTeamQ1",
                },
              },
            },
            {
              title: "Quater 2",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ2", "0"] },
                  then: "-",
                  else: "$homeTeamQ2",
                },
              },
            },
            {
              title: "Quater 3",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ3", "0"] },
                  then: "-",
                  else: "$homeTeamQ3",
                },
              },
            },
            {
              title: "Quater 4",
              score: {
                $cond: {
                  if: { $eq: ["$homeTeamQ4", "0"] },
                  then: "-",
                  else: "$homeTeamQ4",
                },
              },
            },
            {
              title: "Total",
              score: "$homeTeamTotalScoreInNumber",
            },
          ],
        },
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
          homeTeamSpread: "$odds.homeTeamSpread.handicap",
          awayTeamSpread: "$odds.awayTeamSpread.handicap",
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
  await socket("nbaLiveBoxscore", {
    getMatch,
  });
  return getMatch;
};

const updateScoreSummary = async () => {
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
            goalServeMatchId: playByPlayData.data?.scores?.category?.match?.id,
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
export default {
  addNbaMatch,
  addMatchDataFutureForNba,
  updateCurruntDateRecordNba,
  addNbaPlayer,
  addNbaInjuredPlayer,
  addNbaStandings,
  getNbaStandingData,
  nbaScoreWithDate,
  nbaScoreWithCurrentDate,
  createAndUpdateOddsNba,
  nbaGetTeam,
  nbaSingleGameBoxScore,
  updateNbaMatch,
  getLiveDataOfNba,
  getUpcommingMatchNba,
  getFinalMatchNba,
  nbaSingleGameBoxScoreUpcomming,
  nbaSingleGameScoreLive,
  liveBoxscoreNBA,
  updateScoreSummary,
  createAndUpdateMatchOdds,
};
