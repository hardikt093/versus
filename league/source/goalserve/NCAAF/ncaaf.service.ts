import TeamNCAAF from "../../models/documents/NCAAF/team.model";

const addTeam = async (data: any) => {
  const dataTeam = new TeamNCAAF(data);
  await dataTeam.save();
};
export default {
  addTeam,
};
