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
      //   let matchesNeedToRemove = await NflMatch.find({
      //     goalServeLeagueId: getMatch?.data?.shedules?.id,
      //     status: "Not Started",
      //   }).lean();
      const matchArray = await getMatch?.data?.shedules?.tournament;
      //   console.log("matchArray",matchArray)
      const league: ILeagueModel | null = await League.findOne({
        goalServeLeagueId: getMatch?.data?.shedules?.id,
      });
      for (let i = 0; i < matchArray?.length; i++) {
        // console.log("matchArray[i]", matchArray[i]);
        // take season name
        for (let j = 0; j < matchArray[i]?.week?.length; j++) {
          // console.log("matchArray[i]?.match[j]",matchArray[i]?.week[j])
          // take week name
          for (let k = 0; k < matchArray[i]?.week[j].matches.length; k++) {
            // console.log(
            //   "matchArray[i]?.week[j].matches",
            //   typeof matchArray[i]?.week[j].matches[k].match
            // );
            // add dates
            for (
              let l = 0;
              l < matchArray[i]?.week[j].matches[k].match.length;
              l++
            ) {
              //   console.log(
              //     "matchArray[i]?.week[j].matches[k].match[l]",
              //     matchArray[i]?.week[j].matches[k].match[l]
              //   );
              //   matchesNeedToRemove = await removeByAttr(
              //     matchesNeedToRemove,
              //     "goalServerMatchId",
              //     Number(matchArray[i]?.match[j]?.id)
              //   );
              const match: INflMatchModel | null = await NflMatch.findOne({
                goalServeMatchId:
                  matchArray[i]?.week[j]?.matches[k]?.match[l]?.contestID,
              });
              if (!match) {
                // console.log("matchArray[i]?.week[j]?.matches[k]?.match[l]?",matchArray[i]?.week[j]?.matches[k]?.match[l])
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
                    matchArray[i]?.week[j]?.matches[k]?.match[l]?.datetime_utc,
                  formattedDate:
                    matchArray[i]?.week[j]?.matches[k]?.formatted_date,
                  status: matchArray[i]?.week[j]?.matches[k]?.match[l]?.status,
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
                // console.log("data", data);
                  const matchData = new NflMatch(data);
                  await matchData.save();
              }
            }
          }
        }
      }
      //   for (let k = 0; k < matchesNeedToRemove.length; k++) {
      //     const match = matchesNeedToRemove[k];
      //     await NbaMatch.deleteOne({
      //       goalServeMatchId: match.goalServeMatchId,
      //     });

      return true;
    } catch (error: any) {
      console.log("error", error);
    }
  };
}
