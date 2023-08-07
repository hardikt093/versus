import { goalserveApi } from "../../services/goalserve.service";

const addTeam = async () => {
  let data = {
    json: true,
  };
  const getStandings = await goalserveApi(
    "https://www.goalserve.com/getfeed",
    data,
    `football/nfl-standings`
  );

  //   console.log("getAwayTeamImage", getStandings.data.standings.category.league);
  const getData = await getStandings.data.standings.category.league.map(
    (item: any) => {
      console.log("item=====>", item);
    }
  );
  return getStandings.data;
};

export default { addTeam };
