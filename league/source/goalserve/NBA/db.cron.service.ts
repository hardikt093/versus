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
  }