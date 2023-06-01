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
      new Date("2023-05-31")
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
      if (getMatch?.data) {
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
      new Date("2023-06-01"),
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
      if (getMatch?.data) {
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
        allRosterPlayers,
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
          {
            status: {
              $eq: "1st",
            },
          },
          {
            status: {
              $eq: "2nd",
            },
          },
          {
            status: {
              $eq: "3rd",
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
            },
          },
          {
            $facet: {
              rebounds_per_game: [{ $sort: { rebounds_per_game: -1 } }, { $limit: 1 }],
              points_per_game: [{ $sort: { points_per_game: -1 } }, { $limit: 1 }],
              assists_per_game: [{ $sort: { assists_per_game: -1 } }, { $limit: 1 }],
            
            },
          },
          {
            $project: {
             max_rebounds_per_game: { $arrayElemAt: ["$rebounds_per_game", 0] },
             max_points_per_game: { $arrayElemAt: ["$points_per_game", 0] },
             max_assists_per_game: { $arrayElemAt: ["$assists_per_game", 0] },
              
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
              offensive_rebounds_per_game: "$$item.game.offensive_rebounds_per_game",
              defensive_rebounds_per_game: "$$item.game.defensive_rebounds_per_game",
              rebounds_per_game: "$$item.game.rebounds_per_game",
              assists_per_game: "$$item.game.assists_per_game",
              steals_per_game: "$$item.game.steals_per_game",
              blocks_per_game: "$$item.game.blocks_per_game",
              turnovers_per_game: "$$item.game.turnovers_per_game",
              fouls_per_game: "$$item.game.fouls_per_game",
              turnover_ratio: {$cond: {
                if: { $eq: [{$toDouble:"$$item.game.turnovers_per_game"}, 0] },
                then: 0, // or any other default value you want to assign
                else: { $divide:[{$toDouble:"$$item.game.assists_per_game"},{$toDouble:"$$item.game.turnovers_per_game"}] }
              }
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
  console.log(getTeam);
  
  return getTeam[0];
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
  nbaGetTeam
};
