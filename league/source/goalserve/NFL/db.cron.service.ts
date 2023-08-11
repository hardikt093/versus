import PlayersNFL from "../../models/documents/NFL/player.model";
import NflStandings from "../../models/documents/NFL/standings.model";
import League from "../../models/documents/league.model";
import ILeagueModel from "../../models/interfaces/league.interface";
import { INflPlayerModel } from "../../models/interfaces/nflPlayer.interface";
import { goalserveApi } from "../../services/goalserve.service";
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

  public addPlayers = async () => {
    const teams = await NflStandings.find();
    let data = {
      json: true,
    };
    if (teams.length > 0) {
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];

        const roasterApi = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          data,
          `football/${team.goalServeTeamId}_rosters`
        );

        let allRosterPlayers: Partial<INflPlayerModel>[] = [];
        let position = roasterApi?.data?.team?.position;
        for (let p = 0; p < position.length; p++) {
          if (position[p]?.player) {
            let players: any = position[p].player;

            if (players?.length) {
              for (let j = 0; j < players.length; j++) {
                const player: any = players[j];
                const PlayerData = {
                  age: player.age,
                  college: player.college,
                  height: player.height,
                  name: player.name,
                  number: player.number,
                  position: player.position,
                  salarycap: player.salarycap,
                  weight: player.weight,
                  teamId: team.id,
                  experience_years: player.experience_years,
                  goalServeTeamId: team.goalServeTeamId,
                  goalServePlayerId: player.id,
                };
                allRosterPlayers.push(PlayerData);
              }
            } else {
              allRosterPlayers.push({
                age: players.age,
                college: players.college,
                height: players.height,
                name: players.name,
                number: players.number,
                position: players.position,
                salarycap: players.salarycap,
                weight: players.weight,
                experience_years: players.experience_years,
                goalServeTeamId: team.goalServeTeamId,
                goalServePlayerId: players.id,
              });
            }
          }
        }
        const statsApi = await goalserveApi(
          "https://www.goalserve.com/getfeed",
          data,
          `football/${team.goalServeTeamId}_player_stats`
        );
        const allPassingPlayer = [];
        const allRushingPlayer = [];
        const allReceivingPlayer = [];
        const allDefencePlayer = [];
        const allScoringPlayer = [];
        const allReturningPlayer = [];
        const allPuntingPlayer = [];
        const allKickingPlayer = [];
        if (statsApi?.data?.statistic?.category.length) {
          const categories = statsApi.data.statistic.category;
          for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            const categoryName = categories[i].name;
            if (category.player.length) {
              const players = category.player;
              for (let j = 0; j < players.length; j++) {
                const player = players[j];
                const playerData: any = {
                  teamId: team.id,
                  goalServeTeamId: team.goalServeTeamId,
                  goalServePlayerId: player.id,
                };
                switch (categoryName) {
                  case "Passing":
                    playerData.isPassingPlayer = true;
                    playerData.passing = { ...player };
                    allPassingPlayer.push(playerData);
                    break;
                  case "Rushing":
                    playerData.isRushingPlayer = true;
                    playerData.rushing = { ...player };
                    allRushingPlayer.push(playerData);
                    break;
                  case "Receiving":
                    playerData.isReceivingPlayer = true;
                    playerData.receiving = { ...player };
                    allReceivingPlayer.push(playerData);
                    break;
                  case "Defense":
                    playerData.isDefensePlayer = true;
                    playerData.defence = { ...player };
                    allDefencePlayer.push(playerData);
                    break;
                  case "Scoring":
                    playerData.isScoringPlayer = true;
                    playerData.scoring = { ...player };
                    allScoringPlayer.push(playerData);
                    break;
                  case "Returning":
                    playerData.isReturningPlayer = true;
                    playerData.returning = { ...player };
                    allReturningPlayer.push(playerData);
                    break;
                  case "Kicking":
                    playerData.isKickingPlayer = true;
                    playerData.kicking = { ...player };
                    allKickingPlayer.push(playerData);
                    break;
                  case "Punting":
                    playerData.isPuntingPlayer = true;
                    playerData.punting = { ...player };
                    allPuntingPlayer.push(playerData);
                    break;

                  default:
                    break;
                }
              }
            }
          }
        }
        const mergedArray: INflPlayerModel[] | null = await mergeByPlayerId(
          allRosterPlayers,
          allPassingPlayer,
          allRushingPlayer,
          allPuntingPlayer,
          allKickingPlayer,
          allReturningPlayer,
          allScoringPlayer,
          allDefencePlayer,
          allReceivingPlayer
        );
        for (let k = 0; k < mergedArray?.length; k++) {
          const player = mergedArray[k];
          await PlayersNFL.updateOne(
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
}
