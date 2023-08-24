import TeamNCAAF from "../../models/documents/NCAAF/team.model";
var csv = require("csvtojson");

const addTeam = async (data: any) => {
  csv()
    .fromFile(data.path)
    .then(async(jsonObj: any) => {
      var teamArray: any = [];
      for (var i = 0; i < jsonObj.length; i++) {
        var obj: any = {};
        obj.goalServeTeamId = Number(jsonObj[i]["id"]);
        obj.name = jsonObj[i]["Team"];
        obj.teamName = jsonObj[i]["Team Name"];
        obj.leagueId = "64e6f19532c8ff1b335de377";
        obj.leagueName = "FBS (Division I-A)";
        obj.division = jsonObj[i]["Division"];
        obj.locality = jsonObj[i]["Locality"];
        obj.isDeleted = false;
        obj.goalServeLeagueId = 2;
        obj.conference = jsonObj[i]["Conference"];
        obj.conferenceName = jsonObj[i]["Conference Name"];
        obj.conferenceId = jsonObj[i]["Conf_id"];

        teamArray.push(obj);
      }
      await TeamNCAAF.insertMany(teamArray);
    })
    .catch((error: any) => {
      console.log(error);
    });
};


export default {
  addTeam
};
