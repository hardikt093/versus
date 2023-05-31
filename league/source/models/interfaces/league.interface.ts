import { Document } from "mongoose";
export interface ILeagueModel extends Document {
    name: String;
    year?: String ;
    goalServeLeagueId:Number
}
export default ILeagueModel;
