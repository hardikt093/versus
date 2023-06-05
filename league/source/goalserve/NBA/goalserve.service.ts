import { axiosGet } from "../../services/axios.service";
import { goalserveApi } from "../../services/goalserve.service";
import League from "../../models/documents/league.model";
import moment from "moment";
import { isArray } from "lodash";
import Player from "../../models/documents/player.model";
import TeamNBA from "../../models/documents/NBA/team.model";
import TeamImageNBA from "../../models/documents/NBA/teamImage.model";
import NbaMatch from "../../models/documents/NBA/match.model";
import PlayersNBA from "../../models/documents/NBA/player.model";
import NbaInjury from "../../models/documents/NBA/injury.model";
import NbaStandings from "../../models/documents/NBA/standings.model";
import socket from "../../services/socket.service";
import NbaOdds from "../../models/documents/NBA/odds.model";
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
      return myArray[i];
    }
  }
};
const getTotal = (nameKey: any, myArray: any) => {
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
      new Date("2023-06-05")
    );
    for (let i = 0; i < daylist?.length; i++) {
      let dataToStore: any = [];
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
        const league: any = await League.findOne({
          goalServeLeagueId: getMatch?.data.scores.category.id,
        }).lean();
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
            dataToStore.push(data);
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

            const teamIdAway: any = await TeamNBA.findOne({
              goalServeTeamId: matchArray.awayteam.id,
            });
            if (teamIdAway) {
              data.awayTeamId = teamIdAway.id;
              data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
                ? teamIdAway.goalServeTeamId
                : 1;
            }
            const teamIdHome: any = await TeamNBA.findOne({
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
      new Date("2023-06-02"),
      new Date("2023-06-19")
    );
    for (let i = 0; i < daylist?.length; i++) {
      let dataToStore: any = [];
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
        const league: any = await League.findOne({
          goalServeLeagueId: getMatch?.data?.shedules?.id,
        });

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
            dataToStore.push(data);
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

            const teamIdAway: any = await TeamNBA.findOne({
              goalServeTeamId: matchArray.awayteam.id,
            });
            if (teamIdAway) {
              data.awayTeamId = teamIdAway.id;
              data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
                ? teamIdAway.goalServeTeamId
                : 1;
            }
            const teamIdHome: any = await TeamNBA.findOne({
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

        const teamIdAway: any = await TeamNBA.findOne({
          goalServeTeamId: matchArray.awayteam.id,
        });
        if (teamIdAway) {
          data.awayTeamId = teamIdAway.id;
          data.goalServeAwayTeamId = teamIdAway.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 1;
        }
        const teamIdHome: any = await TeamNBA.findOne({
          goalServeTeamId: matchArray.hometeam.id,
        });
        if (teamIdHome) {
          data.homeTeamId = teamIdHome.id;
          data.goalServeHomeTeamId = teamIdHome.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 1;
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
        allRosterPlayers,
        allGamePlayer,
        allShootingPlayer
      );
      for (let k = 0; k < mergedArray.length; k++) {
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
  await NbaInjury.deleteMany({});
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
      if (injuryArray1?.report && injuryArray1?.report?.length > 0) {
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
  await Promise.all(
    getstanding?.data?.standings?.category?.league?.map(async (item: any) => {
      await Promise.all(
        item.division.map(async (div: any) => {
          await Promise.all(
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

const nbaScoreWithDate = async (params: any, type: string) => {
  const date2 = moment(params.date1).add(24, "hours").utc().toISOString();

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
          $gte: params.date1,
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
            $arrayElemAt: ["$odds.awayTeamMoneyline", 0],
          },
          spread: {
            $arrayElemAt: ["$odds.awayTeamSpread", 0],
          },
          total: {
            $arrayElemAt: ["$odds.awayTeamTotal", 0],
          },
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
            $arrayElemAt: ["$odds.homeTeamMoneyline", 0],
          },
          spread: {
            $arrayElemAt: ["$odds.homeTeamSpread", 0],
          },
          total: {
            $arrayElemAt: ["$odds.homeTeamTotal", 0],
          },
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
          $gte: params.date1,
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
              $regex: '^Final',
              $options: 'i'
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
const getLiveDataOfNba = async (params: any) => {
  const date2 = moment(params.date1).add(24, "hours").utc().toISOString();

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
              $not : {
                $regex: '^Final',
                $options: 'i'
              }
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
          $gte: params.date1,
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
          $toInt: "$awayTeamTotalScore",
        },
        homeTeamTotalScoreInNumber: {
          $toInt: "$homeTeamTotalScore",
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
            else: "Overtime",
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
        status: "$statusWithCondition",
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
const nbaScoreWithCurrentDate = async (params: any) => {
  return {
    getLiveMatch: await getLiveDataOfNba(params),
    getUpcomingMatch: await nbaScoreWithDate(params, "upcoming"),
    getFinalMatch: await nbaScoreWithDate(params, "final"),
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
      const takeData = await matchData?.map(async (item: any) => {
        if (item.status) {
          const league: any = await League.findOne({
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
            console.log("getMoneyLine", getMoneyLine);
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
            const getSpread = await getOdds("Run Line", item?.odds?.type);
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
            const getSpread = await getOdds("Run Line", item?.odds?.type);
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
            };
            const updateOdds = await NbaOdds.findOneAndUpdate(
              { goalServerMatchId: item?.id },
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
        const findMatchOdds = await NbaOdds.find({
          goalServeMatchId: matchData?.id,
        });
        if (findMatchOdds?.length == 0) {
          // getMoneyLine
          const getMoneyLine: any = await getOdds(
            "Home/Away",
            matchData?.odds?.type
          );
          console.log("getMoneyLine", getMoneyLine);
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
          const getSpread = await getOdds("Run Line", matchData?.odds?.type);
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
          };
          const oddsData = new NbaOdds(data);
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
          const getSpread = await getOdds("Run Line", matchData?.odds?.type);
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
            : "null";

          const homeTeamSpread = getHomeTeamRunLine
            ? getHomeTeamRunLine?.name?.split(" ").slice(-1)[0]
            : "null";
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
          };
          const updateOdds = await NbaOdds.findOneAndUpdate(
            { goalServerMatchId: matchData?.id },
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

const nbaGetTeam = async (params: any) => {
  const goalServeTeamId = params.goalServeTeamId;
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
            $project: {
              name: true,
              won: true,
              lost: true,
              percentage: true,
              gb: true,
              average_points_for: true,
              average_points_agains: true,
              difference: true,
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
                  {
                    "$status": {
                      $regex: '^Final',
                      $options: 'i'
                    },
                  }
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
        last_10: true,
        streak: true,
        roaster: {
          $map: {
            input: "$teamPlayers",
            as: "item",
            in: {
              salary: "$$item.salary",
              position: "$$item.position",
              goalServePlayerId: "$$item.goalServePlayerId",
              age: "$$item.age",
              heigth: "$$item.heigth",
              weigth: "$$item.weigth",
            },
          },
        },
        playerSkatingStats: {
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
                      $gte: [
                        "$$item.homeTeamTotalScoreInNumber",
                        "$$item.awayTeamTotalScoreInNumber",
                      ],
                    },
                    then: true,
                    else: false,
                  },
                },
                opposingTeam: { $arrayElemAt: ["$$item.opposingTeam", 0] },
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
const nbaSingleGameBoxScore = async (params: any) => {
  const goalServeMatchId = params.goalServeMatchId;
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
      $unwind: {
        path: "$odds",
        includeArrayIndex: "string",
        preserveNullAndEmptyArrays: true,
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
                $and: [{ $eq: ["$goalServeTeamId", "$$homeTeamId"] }],
              },
            },
          },
          {
            $project: {
              player: "$name",
              MIN: "$game.minutes",
              "3PT": "$shooting.three_point_made_per_game",
              GP: "$game.games_played",
              PTS: "$game.points_per_game",
              AST: "$game.assists_per_game",
              BLK: "$game.blocks_per_game",
              REB: "$game.rebounds_per_game",
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
              player: "$name",
              MIN: "$game.minutes",
              "3PT": "$shooting.three_point_made_per_game",
              GP: "$game.games_played",
              PTS: "$game.points_per_game",
              AST: "$game.assists_per_game",
              BLK: "$game.blocks_per_game",
              REB: "$game.rebounds_per_game",
            },
          },
        ],
        as: "awayTeamPlayersStatistic",
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
          homeTeam: {
            Q1: "$homeTeamQ1",
            Q2: "$homeTeamQ2",
            Q3: "$homeTeamQ3",
            Q4: "$homeTeamQ4",
            F: "$homeTeamTotalScore",
          },
          awayTeam: {
            Q1: "$awayTeamQ1",
            Q2: "$awayTeamQ2",
            Q3: "$awayTeamQ3",
            Q4: "$awayTeamQ4",
            F: "$awayTeamTotalScore",
          },
        },
        teamStatistic: {
          homeTeam: {
            FG: "$teamStatsHomeTeam.field_goals_made.total",
            "Field Goal %": "$teamStatsHomeTeam.field_goals_made.pct",
            "3PT": "$teamStatsHomeTeam.threepoint_goals_made.total",
            "Three Point %": "$teamStatsHomeTeam.threepoint_goals_made.pct",
            FT: "$teamStatsHomeTeam.freethrows_goals_made.total",
            "Free throw %": "$teamStatsHomeTeam.freethrows_goals_made.pct",
            Assists: "$teamStatsHomeTeam.assists.total",
            Rebounds: "$teamStatsHomeTeam.rebounds.total",
            Steals: "$teamStatsHomeTeam.steals.total",
            Blocks: "$teamStatsHomeTeam.blocks.total",
            "Total Turnovers": "$teamStatsHomeTeam.turnovers.total",
            Fouls: "$teamStatsHomeTeam.personal_fouls.total",
          },
          awayTeam: {
            FG: "$teamStatsAwayTeam.field_goals_made.total",
            "Field Goal %": "$teamStatsAwayTeam.field_goals_made.pct",
            "3PT": "$teamStatsAwayTeam.threepoint_goals_made.total",
            "Three Point %": "$teamStatsAwayTeam.threepoint_goals_made.pct",
            FT: "$teamStatsAwayTeam.freethrows_goals_made.total",
            "Free throw %": "$teamStatsAwayTeam.freethrows_goals_made.pct",
            Assists: "$teamStatsAwayTeam.assists.total",
            Rebounds: "$teamStatsAwayTeam.rebounds.total",
            Steals: "$teamStatsAwayTeam.steals.total",
            Blocks: "$teamStatsAwayTeam.blocks.total",
            "Total Turnovers": "$teamStatsAwayTeam.turnovers.total",
            Fouls: "$teamStatsAwayTeam.personal_fouls.total",
          },
        },
        playersStatistic: {
          homeTeam: "$homeTeamPlayersStatistic",
          awayTeam: "$awayTeamPlayersStatistic",
        },
        closingOddsAndOutcome: {
          awayTeamMoneyLine: "$odds.awayTeamMoneyline",
          homeTeamMoneyLine: "$odds.homeTeamMoneyline",
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

const updateNbaMatch = async () => {
  try {
    const getMatch = await axiosGet(
      `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/bsktbl/nba-shedule`,
      { json: true }
    );

    const matchArray = await getMatch?.data?.shedules?.matches;
    const league: any = await League.findOne({
      goalServeLeagueId: getMatch?.data?.shedules?.id,
    });
    var savedMatchData: any = "";
    for (let i = 0; i < matchArray?.length; i++) {
      for (let j = 0; j < matchArray[i]?.match?.length; j++) {
        const match: any = await NbaMatch.findOne({
          goalServeMatchId: matchArray[i]?.match[j]?.id,
        });
        if (!match) {
          const data: any = {
            leagueId: league.id,
            goalServeLeagueId: league.goalServeLeagueId,
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
          const teamIdAway: any = await TeamNBA.findOne({
            goalServeTeamId: matchArray[i]?.match[j]?.awayteam.id,
          });

          data.goalServeAwayTeamId = teamIdAway?.goalServeTeamId
            ? teamIdAway.goalServeTeamId
            : 1;

          const teamIdHome: any = await TeamNBA.findOne({
            goalServeTeamId: matchArray[i]?.match[j]?.hometeam.id,
          });

          data.goalServeHomeTeamId = teamIdHome?.goalServeTeamId
            ? teamIdHome.goalServeTeamId
            : 1;
          const matchData = new NbaMatch(data);
          savedMatchData = await matchData.save();
        }
      }
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
              $arrayElemAt: ["$odds.awayTeamMoneyline", 0],
            },
            spread: {
              $arrayElemAt: ["$odds.awayTeamSpread", 0],
            },
            total: {
              $arrayElemAt: ["$odds.awayTeamTotal", 0],
            },
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
              $arrayElemAt: ["$odds.homeTeamMoneyline", 0],
            },
            spread: {
              $arrayElemAt: ["$odds.homeTeamSpread", 0],
            },
            total: {
              $arrayElemAt: ["$odds.homeTeamTotal", 0],
            },
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
              "status": {
                $regex: '^Final',
                $options: 'i'
              },
            }
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
    await socket("nbaFinalMatch", {
      getFinalMatch,
    });
    return getFinalMatch;
  } catch (error: any) {}
};
const nbaSingleGameBoxScoreUpcomming = async (params: any) => {
  const goalServeMatchId = params.goalServeMatchId;
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
              image: 1,
            },
          },
        ],
        as: "teamImages",
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
      $project: {
        id: 1,
        attendance: 1,
        status: 1,
        venueName: 1,
        datetime_utc: "$dateTimeUtc",
        awayTeamFullName: { $arrayElemAt: ["$teams.name", 0] },
        homeTeamFullName: { $arrayElemAt: ["$teams.name", 1] },
        awayTeamAbbreviation: { $arrayElemAt: ["$teams.abbreviation", 0] },
        homeTeamAbbreviation: { $arrayElemAt: ["$teams.abbreviation", 1] },
        homeTeamImage: { $arrayElemAt: ["$teamImages.image", 1] },
        awayTeamImage: { $arrayElemAt: ["$teamImages.image", 0] },
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
                    games_played: "$$player.gamwe.games_played",
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
                    games_played: "$$player.gamwe.games_played",
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
          awayTeamName: { $arrayElemAt: ["$teams.name", 0] },
          awayTeamId: { $arrayElemAt: ["$teams.goalServeTeamId", 0] },
          awayTeamRun: "$awayTeamTotalScore",
          awayTeamHit: "$awayTeamHit",
          awayTeamErrors: "$awayTeamError",
          won: { $arrayElemAt: ["$standings.won", 0] },
          lose: { $arrayElemAt: ["$standings.lost", 0] },
          teamImage: { $arrayElemAt: ["$teamImages.image", 0] },
          moneyline: {
            $arrayElemAt: ["$odds.awayTeamMoneyline", 0],
          },
          spread: {
            $arrayElemAt: ["$odds.awayTeamSpread", 0],
          },
          total: {
            $arrayElemAt: ["$odds.awayTeamTotal", 0],
          },
        },
        homeTeam: {
          homeTeamName: { $arrayElemAt: ["$teams.name", 1] },
          homeTeamId: { $arrayElemAt: ["$teams.goalServeTeamId", 1] },
          homeTeamRun: "$homeTeamTotalScore",
          homeTeamHit: "$homeTeamHit",
          homeTeamErrors: "$homeTeamError",
          won: { $arrayElemAt: ["$standings.won", 1] },
          lose: { $arrayElemAt: ["$standings.lost", 1] },
          teamImage: { $arrayElemAt: ["$teamImages.image", 1] },
          moneyline: {
            $arrayElemAt: ["$odds.homeTeamMoneyline", 0],
          },
          spread: {
            $arrayElemAt: ["$odds.homeTeamSpread", 0],
          },
          total: {
            $arrayElemAt: ["$odds.homeTeamTotal", 0],
          },
        },
        teamStatistics: [
          {
            title: "Wins",
            homeTeam: { $arrayElemAt: ["$standings.won", 1] },
            awayTeam: { $arrayElemAt: ["$standings.won", 0] },
            total: {
              $add: [
                {
                  $toInt: { $arrayElemAt: ["$standings.won", 1] },
                },
                {
                  $toInt: { $arrayElemAt: ["$standings.won", 0] },
                },
              ],
            },
          },
          {
            title: "Points For",
            homeTeam: { $arrayElemAt: ["$standings.average_points_for", 1] },
            awayTeam: { $arrayElemAt: ["$standings.average_points_for", 0] },
            total: {
              $add: [
                {
                  $toDouble: {
                    $arrayElemAt: ["$standings.average_points_for", 1],
                  },
                },
                {
                  $toDouble: {
                    $arrayElemAt: ["$standings.average_points_for", 0],
                  },
                },
              ],
            },
          },
          {
            title: "Points Against",
            homeTeam: { $arrayElemAt: ["$standings.average_points_agains", 1] },
            awayTeam: { $arrayElemAt: ["$standings.average_points_agains", 0] },
            total: {
              $add: [
                {
                  $toDouble: {
                    $arrayElemAt: ["$standings.average_points_agains", 1],
                  },
                },
                {
                  $toDouble: {
                    $arrayElemAt: ["$standings.average_points_agains", 0],
                  },
                },
              ],
            },
          },
          {
            title: "Losses",
            homeTeam: { $arrayElemAt: ["$standings.lost", 1] },
            awayTeam: { $arrayElemAt: ["$standings.lost", 0] },
            total: {
              $add: [
                {
                  $toInt: { $arrayElemAt: ["$standings.lost", 1] },
                },
                {
                  $toInt: { $arrayElemAt: ["$standings.lost", 0] },
                },
              ],
            },
          },
        ],
        closingOddsAndOutcome: {
          awayTeamMoneyLine: "$closingOdds.awayTeamMoneyline",
          homeTeamMoneyLine: "$closingOdds.homeTeamMoneyline",
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

export default {
  createTeamNBA,
  addNBATeamImage,
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
};
