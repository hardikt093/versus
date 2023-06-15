import { model, Schema } from "mongoose";
import ITeamImagesModel from "../../interfaces/teamImage.interface";
var leagueSchema = new Schema(
    {
        teamId: { required: true, type: Schema.Types.ObjectId, ref: "team" },
        goalServeTeamId: { type: String },
        image: { type: String, required: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);
const League = model<ITeamImagesModel>("teamImage", leagueSchema);

export default League;
