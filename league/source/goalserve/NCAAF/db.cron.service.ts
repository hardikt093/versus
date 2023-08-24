import NCAAFStandings from "../../models/documents/NCAAF/standing.model";
import League from "../../models/documents/league.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import { goalserveApi } from "../../services/goalserve.service";

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
  };
}
