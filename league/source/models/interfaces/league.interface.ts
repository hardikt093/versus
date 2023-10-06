export interface ILeagueModel extends Document {
    _id:string;
  name?: string;
  year?: string;
  goalServeLeagueId: number;
}
export default ILeagueModel;
