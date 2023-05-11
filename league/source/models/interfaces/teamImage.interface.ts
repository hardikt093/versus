import { Document } from "mongoose";
export interface ITeamImagesModel extends Document {
    teamId: String;
    goalServeTeamId: String;
    image: String;

}
export default ITeamImagesModel;
