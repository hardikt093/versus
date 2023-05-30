import httpStatus from "http-status";
import { IDivision, ITeam } from "../../interfaces/input";
import { axiosGet } from "../../services/axios.service";
import { goalserveApi } from "../../services/goalserve.service";
import betServices from "../../bet/bet.service";
import socket from "../../services/socket.service";
import AppError from "../../utils/AppError";
import League from "../../models/documents/league.model";
import moment from "moment";
import Player from "../../models/documents/player.model";
import Team from "../../models/documents/team.model";
import Division from "../../models/documents/division.model";
import { isArray } from "lodash";
import Match from "../../models/documents/match.model";
import Bet from "../../models/documents/bet.model";
import Inning from "../../models/documents/inning.model";
import StartingPitchers from "../../models/documents/startingPictures";
import Standings from "../../models/documents/standing.model";
import Injury from "../../models/documents/injuy.model";
import Odd from "../../models/documents/odd.model";
import StatsPlayer from "../../models/documents/statsPlayer.model";
import StatsTeam from "../../models/documents/teamStats.model";
import TeamNHL from "../../models/documents/NHL/team.model";
import TeamImageNHL from "../../models/documents/NHL/teamImage.model";
import NhlMatch from "../../models/documents/NHL/match.model";
import PlayersNHL from "../../models/documents/NHL/player.model";
import NhlInjury from "../../models/documents/NHL/injury.model";
import NhlStandings from "../../models/documents/NHL/standing,model";
import TeamNBA from "../../models/documents/NBA/team.model";
import TeamImageNBA from "../../models/documents/NBA/teamImage.model";
import NbaMatch from "../../models/documents/NBA/match.model";
import PlayersNBA from "../../models/documents/NBA/player.model";
import NbaInjury from "../../models/documents/NBA/injury.model";
import NbaStandings from "../../models/documents/NBA/standings.model";
function camelize(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}
const createTeamNBA = async (body: any) => {
  let dataJson = {
    json: true,
  };
  const standing = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    dataJson,
    `bsktbl/nba-standings`
  );
  const league = await League.findOne({
    goalServeLeagueId: standing.data.standings.category.id,
  });
  let data: any = {
    goalServeLeagueId: standing.data.standings.category.id,
    leagueId: league?.id,
  };
  for (const league of standing.data.standings.category.league) {
    for (const div of league.division) {
      data.leagueType = league.name;
      data.division = div.name;
      for (const team of div.team) {
        const roaster = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          dataJson,
          `bsktbl/${team.id}_rosters`
        );
        data.name = team.name;
        data.goalServeTeamId = team.id;
        data.abbreviation = roaster.data.team.abbreviation;
        const teamNew = await TeamNBA.create(data);
      }
    }
  }
};

const addNBATeamImage = async (body: any) => {
  let data = {
    teamId: body.teamId,
    goalServeTeamId: body.goalServeTeamId,
    image: body.image,
  };
  const teamNewImage = new TeamImageNBA(data);
  await teamNewImage.save();
};

const addNbaMatch = async () => {
  try {
    let getDaysArray = function (start: any, end: any) {
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
      new Date("2023-05-25")
    );
    for (let i = 0; i < daylist?.length; i++) {
      try {
        const getMatch = await axiosGet(
          `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-scores`,
          { json: true, date: daylist[i] }
        );
        if (getMatch) {
          const matchArray = await getMatch?.data?.scores?.category?.match;
          const league: any = await League.findOne({
            goalServeLeagueId: getMatch?.data.scores.category.id,
          });
          let savedMatchData: any = "";
          if (matchArray?.length > 0 && matchArray) {
            for (let j = 0; j < matchArray?.length; j++) {
              const data: any = {
                leagueId: league._id,
                goalServeLeagueId: league.goalServeLeagueId,
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
                playerStatsStartersAwayTeam: matchArray[j]?.player_stats
                  ?.awayteam?.starters?.player
                  ? matchArray[j]?.player_stats?.awayteam?.starters?.player
                  : [],
                playerStatsStartersHomeTeam: matchArray[j]?.player_stats
                  ?.hometeam?.starters?.player
                  ? matchArray[j]?.player_stats?.hometeam?.starters?.player
                  : [],
              };
              const teamIdAway: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray[j].awayteam.id,
              });

              data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
                ? teamIdAway.goalServeTeamId
                : 1;

              const teamIdHome: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray[j].hometeam.id,
              });

              data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
                ? teamIdHome.goalServeTeamId
                : 1;

              const matchData = new NbaMatch(data);
              savedMatchData = await matchData.save();
            }
          } else {
            if (matchArray) {
              const data: any = {
                leagueId: league._id,
                goalServeLeagueId: league.goalServeLeagueId,
                date: matchArray.date,
                formattedDate: matchArray.formatted_date,
                dateTimeUtc: matchArray.datetime_utc,
                timezone: matchArray.timezone,
                attendance: matchArray.attendance,
                goalServematchArrayId: matchArray.id,
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
              };

              const teamIdAway: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray.awayteam.id,
              });
              if (teamIdAway) {
                data.awayTeamId = teamIdAway.id;
                data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
                  ? teamIdAway.goalServeTeamId
                  : 0;
              }
              const teamIdHome: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray.hometeam.id,
              });
              if (teamIdHome) {
                data.homeTeamId = teamIdHome.id;
                data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
                  ? teamIdHome.goalServeTeamId
                  : 0;
              }
              const matchData = new NbaMatch(data);
              savedMatchData = await matchData.save();
            }
          }
        }
      } catch (error) {
        continue;
      }
    }
    return true;
  } catch (error: any) {
    console.log("error", error);
  }
};

const addMatchDataFutureForNba = async () => {
  try {
    const getDaysArray = function (start: any, end: any) {
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
      new Date("2023-05-26"),
      new Date("2023-06-19")
    );
    for (let i = 0; i < daylist?.length; i++) {
      try {
        const getMatch = await axiosGet(
          `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-shedule`,
          { json: true, date1: daylist[i] }
        );
        if (getMatch) {
          const matchArray = await getMatch?.data?.shedules?.matches?.match;
          const league: any = await League.findOne({
            goalServeLeagueId: getMatch?.data?.shedules?.id,
          });
          console.log(matchArray);

          let savedMatchData: any = "";
          if (matchArray?.length > 0 && matchArray) {
            // array logic
            for (let j = 0; j < matchArray?.length; j++) {
              const data: any = {
                leagueId: league.id,
                goalServeLeagueId: league.goalServeLeagueId,
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

              const teamIdAway: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray[j].awayteam.id,
              });

              data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
                ? teamIdAway.goalServeTeamId
                : 1;

              const teamIdHome: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray[j].hometeam.id,
              });

              data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
                ? teamIdHome.goalServeTeamId
                : 1;
              const matchData = new NbaMatch(data);
              savedMatchData = await matchData.save();
            }
          } else {
            if (matchArray) {
              const data: any = {
                leagueId: league._id,
                goalServeLeagueId: league.goalServeLeagueId,
                date: matchArray.date,
                formattedDate: matchArray.formatted_date,
                dateTimeUtc: matchArray.datetime_utc,
                timezone: matchArray.timezone,
                attendance: matchArray.attendance,
                goalServematchArrayId: matchArray.id,
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
              };

              const teamIdAway: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray.awayteam.id,
              });
              if (teamIdAway) {
                data.awayTeamId = teamIdAway.id;
                data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
                  ? teamIdAway.goalServeTeamId
                  : 0;
              }
              const teamIdHome: any = await TeamNBA.findOne({
                goalServeTeamId: matchArray.hometeam.id,
              });
              if (teamIdHome) {
                data.homeTeamId = teamIdHome.id;
                data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
                  ? teamIdHome.goalServeTeamId
                  : 0;
              }
              const matchData = new NbaMatch(data);
              savedMatchData = await matchData.save();
            }
          }
        }
      } catch (error) {
        continue;
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
    const league: any = await League.findOne({
      goalServeLeagueId: getMatch?.data.scores.category.id,
    });
    var savedMatchData: any = "";
    if (matchArray?.length > 0 && matchArray) {
      // array logic
      for (let j = 0; j < matchArray?.length; j++) {
        const data: any = {
          leagueId: league._id,
          goalServeLeagueId: league.goalServeLeagueId,
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
        const teamIdAway: any = await TeamNBA.findOne({
          goalServeTeamId: matchArray[j].awayteam.id,
        });

        data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
          ? teamIdAway.goalServeTeamId
          : 1;

        const teamIdHome: any = await TeamNBA.findOne({
          goalServeTeamId: matchArray[j].hometeam.id,
        });

        data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
          ? teamIdHome.goalServeTeamId
          : 1;
        const recordUpdate = await NbaMatch.findOneAndUpdate(
          { goalServeMatchId: data.goalServeMatchId },
          { $set: data },
          { new: true }
        );
      }
    } else {
      if (matchArray) {
        const data: any = {
          leagueId: league._id,
          goalServeLeagueId: league.goalServeLeagueId,
          date: matchArray.date,
          formattedDate: matchArray.formatted_date,
          dateTimeUtc: matchArray.datetime_utc,
          timezone: matchArray.timezone,
          attendance: matchArray.attendance,
          goalServematchArrayId: matchArray.id,
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

        const teamIdAway: any = await TeamNBA.findOne({
          goalServeTeamId: matchArray.awayteam.id,
        });
        if (teamIdAway) {
          data.awayTeamId = teamIdAway.id;
          data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 0;
        }
        const teamIdHome: any = await TeamNBA.findOne({
          goalServeTeamId: matchArray.hometeam.id,
        });
        if (teamIdHome) {
          data.homeTeamId = teamIdHome.id;
          data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 0;
        }
        const recordUpdate = await NbaMatch.findOneAndUpdate(
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
      let allRosterPlayers: any = [];
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
      const mergedArray: any = await mergeByPlayerId(
        allGamePlayer,
        allShootingPlayer
      );
      await PlayersNBA.insertMany(mergedArray);
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
      if (injuryArray1?.report?.length) {
        await Promise.all(
          injuryArray1?.report?.map(async (val: any) => {
            const player = await PlayersNBA.findOne({
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
            const playerData = new NbaInjury(data);
            const saveInjuries = await playerData.save();
          })
        );
      } else if (injuryArray1?.report && !injuryArray1?.report?.length) {
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
        const playerData = new NbaInjury(data);
        const saveInjuries = await playerData.save();
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

  const league: any = await League.findOne({
    goalServeLeagueId: getstanding?.data?.standings?.category?.id,
  });
  getstanding?.data?.standings?.category?.league?.map((item: any) => {
    item.division.map((div: any) => {
      div.team.map(async (team: any) => {
        const teamId: any = await TeamNBA.findOne({
          goalServeTeamId: team.id,
        });
        let data = {
          leagueId: league?.id,
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
        const standingData = new NbaStandings(data);
        await standingData.save();
      });
    });
  });
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
            last_10: "$last_10",
            lost: "$lost",
            name: "$name",
            percentage: "$percentage",
            position: "$position",
            road_record: "$road_record",
            streak: "$streak",
            won: "$won",
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

export default {
  createTeamNBA,
  addNBATeamImage,
  addNbaMatch,
  addMatchDataFutureForNba,
  updateCurruntDateRecordNba,
  addNbaPlayer,
  addNbaInjuredPlayer,
  addNbaStandings,
  getNbaStandingData
};
