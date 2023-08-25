import NCAAFStandings from "../../models/documents/NCAAF/standing.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import { goalserveApi } from "../../services/goalserve.service";
import NcaafMatch from "../../models/documents/NCAAF/match.model";
import League from "../../models/documents/league.model";
import INcaafMatchModel from "../../models/interfaces/ncaafMatch.interface";
import { axiosGet } from "../../services/axios.service";

export default class NCAAFDbCronServiceClass {
  public addNCAAFStandings = async () => {
    let data = {
      json: true,
    };
    const getstanding = await goalserveApi(
      "https://www.goalserve.com/getfeed",
      data,
      `football/fbs-standings`
    );

    const league: ILeagueModel | null = await League.findOne({
      goalServeLeagueId: getstanding?.data?.standings?.category?.id,
    });
    await Promise.all(
      getstanding?.data?.standings?.category?.league?.map(async (item: any) => {
        if (item.division.length) {
          item.division.map(async (div: any) => {
            await Promise.all(
              div.team.map(async (team: any) => {
                let data = {
                  leagueId: league?._id,
                  leagueType: item?.name,
                  goalServeLeagueId: getstanding?.data?.standings?.category?.id,
                  division: div?.name,
                  goalServeTeamId: team?.id,
                  conference_lost: team.conference_lost,
                  conference_points_against: team.conference_points_against,
                  conference_points_for: team.conference_points_for,
                  conference_won: team.conference_won,
                  name: team.name,
                  overall_lost: team.overall_lost,
                  overall_points_against: team.overall_points_against,
                  overall_points_for: team.overall_points_for,
                  overall_won: team.overall_points_for,
                  position: team.position,
                  streak: team.streak,
                };

                await NCAAFStandings.findOneAndUpdate(
                  { goalServeTeamId: team?.id },
                  { $set: data },
                  { upsert: true }
                );
              })
            );
          });
        } else {
          await Promise.all(
            item.division.team.map(async (team: any) => {
              let data = {
                leagueId: league?._id,
                leagueType: item?.name,
                goalServeLeagueId: getstanding?.data?.standings?.category?.id,
                division: item.division?.name,
                goalServeTeamId: team?.id,
                conference_lost: team.conference_lost,
                conference_points_against: team.conference_points_against,
                conference_points_for: team.conference_points_for,
                conference_won: team.conference_won,
                name: team.name,
                overall_lost: team.overall_lost,
                overall_points_against: team.overall_points_against,
                overall_points_for: team.overall_points_for,
                overall_won: team.overall_points_for,
                position: team.position,
                streak: team.streak,
              };
              await NCAAFStandings.findOneAndUpdate(
                { goalServeTeamId: team?.id },
                { $set: data },
                { upsert: true }
              );
            })
          );
        }
      })
    );
    }
  public updateNcaafMatch = async () => {
    try {
      const getMatch = await axiosGet(
        `http://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/fbs-shedule`,
        { json: true }
      );
      const matchArray = [];
      await matchArray.push(getMatch?.data?.shedules?.tournament);
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
                const match: INcaafMatchModel | null = await NcaafMatch.findOne(
                  {
                    goalServeMatchId:
                      matchArray[i]?.week[j]?.matches[k]?.match[l]?.contestID,
                  }
                );
                if (!match) {
                  const data: Partial<INcaafMatchModel> = {
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
                    const matchData = new NcaafMatch(data);
                    await matchData.save();
                }
              }
              continue;
            }
            continue;
          } else {
            for (
              let m = 0;
              m < matchArray[i]?.week[j].matches?.match.length;
              m++
            ) {
              const match: INcaafMatchModel | null = await NcaafMatch.findOne({
                goalServeMatchId:
                  matchArray[i]?.week[j]?.matches?.match[m]?.contestID,
              });
              if (!match) {
                const data: Partial<INcaafMatchModel> = {
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
                const matchData = new NcaafMatch(data);
                await matchData.save();
              }
            }
            continue;
          }
        }
        continue;
      }
    } catch (error: any) {
      console.log("error", error);
    }
  };
  
   public updateLiveMatch = async () => {
    try {
      const getMatch: any = await axiosGet(
        `https://www.goalserve.com/getfeed/1db8075f29f8459c7b8408db308b1225/football/fbs-scores`,
        { json: true }
      );
      const matchArray = await getMatch?.data?.scores?.category?.match;
      const league: ILeagueModel | undefined | null = await League.findOne({
        goalServeLeagueId: getMatch?.data?.scores?.category?.id,
      });
      if (matchArray?.length > 0 && matchArray) {
        for (let i = 0; i < matchArray?.length; i++) {
          const match: INcaafMatchModel | null = await NcaafMatch.findOne({
            goalServeMatchId: matchArray[i]?.contestID,
          });
          if (match) {
            const data: Partial<INcaafMatchModel> = {
              attendance: matchArray[i]?.attendance,
              goalServeHomeTeamId: matchArray[i]?.hometeam.id,
              goalServeAwayTeamId: matchArray[i]?.awayteam.id,

              date: matchArray[i]?.date,
              dateTimeUtc: matchArray[i]?.datetime_utc,
              formattedDate: matchArray[i]?.formatted_date,
              status: matchArray[i]?.status,
              time: matchArray[i]?.time,
              timezone: matchArray[i]?.timezone,
              goalServeVenueId: matchArray[i]?.venue_id,
              venueName: matchArray[i]?.venue,
              homeTeamTotalScore: matchArray[i]?.hometeam.totalscore,
              awayTeamTotalScore: matchArray[i]?.awayteam.totalscore,

              timer: matchArray[i]?.timer ? matchArray[i]?.timer : "",
              awayTeamOt: matchArray[i]?.awayteam.ot
                ? matchArray[i]?.awayteam.ot
                : "",
              awayTeamQ1: matchArray[i]?.awayteam.q1
                ? matchArray[i]?.awayteam.q1
                : "",
              awayTeamQ2: matchArray[i]?.awayteam.q2
                ? matchArray[i]?.awayteam.q2
                : "",
              awayTeamQ3: matchArray[i]?.awayteam.q3
                ? matchArray[i]?.awayteam.q3
                : "",
              awayTeamQ4: matchArray[i]?.awayteam.q4
                ? matchArray[i]?.awayteam.q4
                : "",
              awayTeamBallOn: matchArray[i]?.awayteam.ball_on
                ? matchArray[i]?.awayteam.ball_on
                : "",
              awayTeamDrive: matchArray[i]?.awayteam.drive
                ? matchArray[i]?.awayteam.drive
                : "",
              awayTeamNumber: matchArray[i]?.awayteam.number
                ? matchArray[i]?.awayteam.number
                : "",

              homeTeamOt: matchArray[i]?.hometeam.ot
                ? matchArray[i]?.hometeam.ot
                : "",
              homeTeamQ1: matchArray[i]?.hometeam.q1
                ? matchArray[i]?.hometeam.q1
                : "",
              homeTeamQ2: matchArray[i]?.hometeam.q2
                ? matchArray[i]?.hometeam.q2
                : "",
              homeTeamQ3: matchArray[i]?.hometeam.q3
                ? matchArray[i]?.hometeam.q3
                : "",
              homeTeamQ4: matchArray[i]?.hometeam.q4
                ? matchArray[i]?.hometeam.q4
                : "",
              homeTeamBallOn: matchArray[i]?.awayteam.ball_on
                ? matchArray[i]?.awayteam.ball_on
                : "",
              homeTeamDrive: matchArray[i]?.hometeam.drive
                ? matchArray[i]?.hometeam.drive
                : "",
              homeTeamNumber: matchArray[i]?.hometeam.number
                ? matchArray[i]?.hometeam.number
                : "",
              awayTeamDefensive: matchArray[i]?.defensive?.awayteam?.player
                ? matchArray[i]?.defensive?.awayteam?.player
                : [],
              homeTeamDefensive: matchArray[i]?.defensive?.hometeam?.player
                ? matchArray[i]?.defensive?.hometeam?.player
                : [],

              firstQuarterEvent: matchArray[i]?.events?.firstquarter?.event
                ? matchArray[i]?.events?.firstquarter?.event
                : [],
              fourthQuarterEvent: matchArray[i]?.events?.fourthquarter?.event
                ? matchArray[i]?.events?.fourthquarter?.event
                : [],
              overtimeEvent: matchArray[i]?.events?.overtime?.event
                ? matchArray[i]?.events?.overtime?.event
                : [],
              secondQuarterEvent: matchArray[i]?.events?.secondquarter?.event
                ? matchArray[i]?.events?.secondquarter?.event
                : [],
              thirdQuarterEvent:
                matchArray[i]?.events?.thirdquarter?.event != null
                  ? matchArray[i]?.events?.thirdquarter?.event
                  : [],

              awayTeamFumbles: matchArray[i]?.fumbles?.awayteam?.player
                ? matchArray[i]?.fumbles?.awayteam?.player
                : [],
              homeTeamFumbles: matchArray[i]?.fumbles?.hometeam?.player
                ? matchArray[i]?.fumbles?.hometeam?.player
                : [],

              awayTeamInterceptions: matchArray[i]?.interceptions?.awayteam
                ?.player
                ? matchArray[i]?.interceptions?.awayteam?.player
                : [],
              homeTeamInterceptions: matchArray[i]?.interceptions?.hometeam
                ?.player
                ? matchArray[i]?.interceptions?.hometeam?.player
                : [],

              awayTeamKickReturn: matchArray[i]?.kick_returns?.awayteam?.player
                ? matchArray[i]?.kick_returns?.awayteam?.player
                : [],
              homeTeamKickReturn: matchArray[i]?.kick_returns?.hometeam?.player
                ? matchArray[i]?.kick_returns?.hometeam?.player
                : [],

              awayTeamKick: matchArray[i]?.kicking?.awayteam?.player
                ? matchArray[i]?.kicking?.awayteam?.player
                : {},
              homeTeamKick: matchArray[i]?.kicking?.hometeam?.player
                ? matchArray[i]?.kicking?.hometeam?.player
                : {},

              awayTeamPassing: matchArray[i]?.passing?.awayteam?.player
                ? matchArray[i]?.passing?.awayteam?.player
                : [],
              homeTeamPassing: matchArray[i]?.passing?.hometeam?.player
                ? matchArray[i]?.passing?.hometeam?.player
                : [],

              awayTeamPuntReturns: matchArray[i]?.punt_returns?.awayteam?.player
                ? matchArray[i]?.punt_returns?.awayteam?.player
                : [],
              homeTeamPuntReturns: matchArray[i]?.punt_returns?.hometeam?.player
                ? matchArray[i]?.punt_returns?.hometeam?.player
                : [],

              awayTeamPunting: matchArray[i]?.punting?.awayteam?.player
                ? matchArray[i]?.punting?.awayteam?.player
                : [],
              homeTeamPunting: matchArray[i]?.punting?.hometeam?.player
                ? matchArray[i]?.punting?.hometeam?.player
                : [],

              awayTeamReceiving: matchArray[i]?.receiving?.awayteam?.player
                ? matchArray[i]?.receiving?.awayteam?.player
                : [],
              homeTeamReceiving: matchArray[i]?.receiving?.hometeam?.player
                ? matchArray[i]?.receiving?.hometeam?.player
                : [],

              awayTeamRushing: matchArray[i]?.rushing?.awayteam?.player
                ? matchArray[i]?.rushing?.awayteam?.player
                : [],
              homeTeamRushing: matchArray[i]?.rushing?.hometeam?.player
                ? matchArray[i]?.rushing?.hometeam?.player
                : [],
            };
            const dataUpdate = await NcaafMatch.findOneAndUpdate(
              { goalServeMatchId: matchArray[i]?.contestID },
              { $set: data },
              { new: true }
            );
          }
        }
      } else {
        if (matchArray) {
          const match: INcaafMatchModel | null = await NcaafMatch.findOne({
            goalServeMatchId: matchArray?.contestID,
          });
          if (match) {
            const data: Partial<INcaafMatchModel> = {
              attendance: matchArray?.attendance,
              goalServeHomeTeamId: matchArray?.hometeam.id,
              goalServeAwayTeamId: matchArray?.awayteam.id,

              date: matchArray?.date,
              dateTimeUtc: matchArray?.datetime_utc,
              formattedDate: matchArray?.formatted_date,
              status: matchArray?.status,
              time: matchArray?.time,
              timezone: matchArray?.timezone,
              goalServeVenueId: matchArray?.venue_id,
              venueName: matchArray?.venue,
              homeTeamTotalScore: matchArray?.hometeam.totalscore,
              awayTeamTotalScore: matchArray?.awayteam.totalscore,

              timer: matchArray?.timer ? matchArray?.timer : "",
              awayTeamOt: matchArray?.awayteam.ot
                ? matchArray?.awayteam.ot
                : "",
              awayTeamQ1: matchArray?.awayteam.q1
                ? matchArray?.awayteam.q1
                : "",
              awayTeamQ2: matchArray?.awayteam.q2
                ? matchArray?.awayteam.q2
                : "",
              awayTeamQ3: matchArray?.awayteam.q3
                ? matchArray?.awayteam.q3
                : "",
              awayTeamQ4: matchArray?.awayteam.q4
                ? matchArray?.awayteam.q4
                : "",
              awayTeamBallOn: matchArray?.awayteam.ball_on
                ? matchArray?.awayteam.ball_on
                : "",
              awayTeamDrive: matchArray?.awayteam.drive
                ? matchArray?.awayteam.drive
                : "",
              awayTeamNumber: matchArray?.awayteam.number
                ? matchArray?.awayteam.number
                : "",

              homeTeamOt: matchArray?.hometeam.ot
                ? matchArray?.hometeam.ot
                : "",
              homeTeamQ1: matchArray?.hometeam.q1
                ? matchArray?.hometeam.q1
                : "",
              homeTeamQ2: matchArray?.hometeam.q2
                ? matchArray?.hometeam.q2
                : "",
              homeTeamQ3: matchArray?.hometeam.q3
                ? matchArray?.hometeam.q3
                : "",
              homeTeamQ4: matchArray?.hometeam.q4
                ? matchArray?.hometeam.q4
                : "",
              homeTeamBallOn: matchArray?.awayteam.ball_on
                ? matchArray?.awayteam.ball_on
                : "",
              homeTeamDrive: matchArray?.hometeam.drive
                ? matchArray?.hometeam.drive
                : "",
              homeTeamNumber: matchArray?.hometeam.number
                ? matchArray?.hometeam.number
                : "",
              awayTeamDefensive: matchArray?.defensive?.awayteam?.player
                ? matchArray?.defensive?.awayteam?.player
                : [],
              homeTeamDefensive: matchArray?.defensive?.hometeam?.player
                ? matchArray?.defensive?.hometeam?.player
                : [],

              firstQuarterEvent: matchArray?.events?.firstquarter?.event
                ? matchArray?.events?.firstquarter?.event
                : [],
              fourthQuarterEvent: matchArray?.events?.fourthquarter?.event
                ? matchArray?.events?.fourthquarter?.event
                : [],
              overtimeEvent: matchArray?.events?.overtime?.event
                ? matchArray?.events?.overtime?.event
                : [],
              secondQuarterEvent: matchArray?.events?.secondquarter?.event
                ? matchArray?.events?.secondquarter?.event
                : [],
              thirdQuarterEvent:
                matchArray?.events?.thirdquarter?.event != null
                  ? matchArray?.events?.thirdquarter?.event
                  : [],

              awayTeamFumbles: matchArray?.fumbles?.awayteam?.player
                ? matchArray?.fumbles?.awayteam?.player
                : [],
              homeTeamFumbles: matchArray?.fumbles?.hometeam?.player
                ? matchArray?.fumbles?.hometeam?.player
                : [],

              awayTeamInterceptions: matchArray?.interceptions?.awayteam?.player
                ? matchArray?.interceptions?.awayteam?.player
                : [],
              homeTeamInterceptions: matchArray?.interceptions?.hometeam?.player
                ? matchArray?.interceptions?.hometeam?.player
                : [],

              awayTeamKickReturn: matchArray?.kick_returns?.awayteam?.player
                ? matchArray?.kick_returns?.awayteam?.player
                : [],
              homeTeamKickReturn: matchArray?.kick_returns?.hometeam?.player
                ? matchArray?.kick_returns?.hometeam?.player
                : [],

              awayTeamKick: matchArray?.kicking?.awayteam?.player
                ? matchArray?.kicking?.awayteam?.player
                : {},
              homeTeamKick: matchArray?.kicking?.hometeam?.player
                ? matchArray?.kicking?.hometeam?.player
                : {},

              awayTeamPassing: matchArray?.passing?.awayteam?.player
                ? matchArray?.passing?.awayteam?.player
                : [],
              homeTeamPassing: matchArray?.passing?.hometeam?.player
                ? matchArray?.passing?.hometeam?.player
                : [],

              awayTeamPuntReturns: matchArray?.punt_returns?.awayteam?.player
                ? matchArray?.punt_returns?.awayteam?.player
                : [],
              homeTeamPuntReturns: matchArray?.punt_returns?.hometeam?.player
                ? matchArray?.punt_returns?.hometeam?.player
                : [],

              awayTeamPunting: matchArray?.punting?.awayteam?.player
                ? matchArray?.punting?.awayteam?.player
                : [],
              homeTeamPunting: matchArray?.punting?.hometeam?.player
                ? matchArray?.punting?.hometeam?.player
                : [],

              awayTeamReceiving: matchArray?.receiving?.awayteam?.player
                ? matchArray?.receiving?.awayteam?.player
                : [],
              homeTeamReceiving: matchArray?.receiving?.hometeam?.player
                ? matchArray?.receiving?.hometeam?.player
                : [],

              awayTeamRushing: matchArray?.rushing?.awayteam?.player
                ? matchArray?.rushing?.awayteam?.player
                : [],
              homeTeamRushing: matchArray?.rushing?.hometeam?.player
                ? matchArray?.rushing?.hometeam?.player
                : [],
            };
            const dataUpdate = await NcaafMatch.findOneAndUpdate(
              { goalServeMatchId: matchArray?.contestID },
              { $set: data },
              { new: true }
            );
          }
        }
      }
    } catch (error) {
      console.log("error", error);
    }
  };
}