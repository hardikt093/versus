import NflMatch from "../../models/documents/NFL/match.model";
import NflStandings from "../../models/documents/NFL/standings.model";
import League from "../../models/documents/league.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import INflMatchModel from "../../models/interfaces/nflMatch.interface";
import { axiosGet } from "../../services/axios.service";
import { goalserveApi } from "../../services/goalserve.service";

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

  public updateNbaMatch = async () => {
    try {
      const getMatch = await axiosGet(
        `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/nfl-shedule`,
        { json: true }
      );
      let matchesNeedToRemove = await NflMatch.find({
        goalServeLeagueId: getMatch?.data?.shedules?.id,
        status: "Not Started",
      }).lean();
      const matchArray = await getMatch?.data?.shedules?.matches;
      const league: ILeagueModel | null = await League.findOne({
        goalServeLeagueId: getMatch?.data?.shedules?.id,
      });
      for (let i = 0; i < matchArray?.length; i++) {
        for (let j = 0; j < matchArray[i]?.match?.length; j++) {
        //   matchesNeedToRemove = await removeByAttr(
        //     matchesNeedToRemove,
        //     "goalServerMatchId",
        //     Number(matchArray[i]?.match[j]?.id)
        //   );
          const match: INflMatchModel | null = await NflMatch.findOne({
            goalServeMatchId: matchArray[i]?.match[j]?.id,
          });
          if (!match) {
            const data: Partial<INflMatchModel> = {
              goalServeLeagueId: league?.goalServeLeagueId,
              goalServeMatchId: matchArray[i]?.match[j].id,
              attendance: matchArray[i]?.match[j].attendance,
              goalServeHomeTeamId: matchArray[i]?.match[j].hometeam.id,
              goalServeAwayTeamId: matchArray[i]?.match[j].awayteam.id,
              
              date: matchArray[i]?.match[j].date,
              dateTimeUtc: matchArray[i]?.match[j].datetime_utc,
              formattedDate: matchArray[i]?.match[j].formatted_date,
              status: matchArray[i]?.match[j].status,
              time: matchArray[i]?.match[j].time,
              timezone: matchArray[i]?.match[j].timezone,
              goalServeVenueId: matchArray[i]?.match[j].venue_id,
              venueName: matchArray[i]?.match[j].venue_name,
              homeTeamTotalScore: matchArray[i]?.match[j].hometeam.totalscore,
              awayTeamTotalScore: matchArray[i]?.match[j].awayteam.totalscore,
             
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
    //   for (let k = 0; k < matchesNeedToRemove.length; k++) {
    //     const match = matchesNeedToRemove[k];
    //     await NbaMatch.deleteOne({
    //       goalServeMatchId: match.goalServeMatchId,
    //     });
    //   }
      return true;
    } catch (error: any) {
      console.log("error", error);
    }
  };

}