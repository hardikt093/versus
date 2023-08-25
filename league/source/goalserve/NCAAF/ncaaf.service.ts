import NcaafMatch from "../../models/documents/NCAAF/match.model";
import TeamNCAAF from "../../models/documents/NCAAF/team.model";
import League from "../../models/documents/league.model";
import ILeagueModel from "../../models/interfaces/league.interface";
var csv = require("csvtojson");

const addTeam = async (data: any) => {
  const league: ILeagueModel | undefined | null = await League.findOne({
    goalServeLeagueId: 2,
  });
  csv()
    .fromFile(data.path)
    .then(async (jsonObj: any) => {
      var teamArray: any = [];
      for (var i = 0; i < jsonObj.length; i++) {
        var obj: any = {};
        obj.goalServeTeamId = Number(jsonObj[i]["id"]);
        obj.name = jsonObj[i]["Team"];
        obj.teamName = jsonObj[i]["Team Name"];
        obj.leagueId = league?._id;
        obj.leagueName = league?.name;
        obj.division = jsonObj[i]["Division"];
        obj.locality = jsonObj[i]["Locality"];
        obj.isDeleted = false;
        obj.goalServeLeagueId = league?.goalServeLeagueId;
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

const getCalendar = async () => {
  const getCalendar = await NcaafMatch.aggregate([
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
      $sort: {
        dateutc: 1,
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
      $group: {
        _id: {
          weekName: "$weekName",
        },
        dates: {
          $push: "$dateTimeUtc",
        },
        dateInString: {
          $push: "$dateInString",
        },
      },
    },
    {
      $group: {
        _id: null,
        weekItem: {
          $push: {
            title: "$_id.weekName",
            dates: "$dates",
            dateInString: "$dateInString",
          },
        },
      },
    },
    {
      $project: {
        _id: false,
        weekItem: {
          $sortArray: {
            input: "$weekItem",
            sortBy: {
              dateInString: 1,
            },
          },
        },
      },
    },
  ]);
  return await Promise.all(
    getCalendar.map(async (item: any) => {
      return item
    })
  );
};


export default {
  addTeam,
  getCalendar
};
