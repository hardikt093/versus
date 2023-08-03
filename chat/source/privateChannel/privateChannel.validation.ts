import Joi from "@hapi/joi";

const createPrivateChannel = {
  body: Joi.object().keys({
    channelName: Joi.string().min(5).max(30).required(),
    channelType: Joi.string().required(),
  }),
};
const addUserToPrivateChannel = {
  body: Joi.object().keys({
    userId: Joi.array().items(Joi.number()),
    channelId: Joi.number().required(),
  }),
};
const updatePrivateChannel = {
  params: { id: Joi.number().required() },
  body: Joi.object().keys({
    channelData: {
      channelName: Joi.string().min(5).max(30),
      channelType: Joi.string(),
      description: Joi.string().min(5).max(100),
    },
  }),
};

const updateHeader = {
  body: Joi.object().keys({
    channelHeader: {
      goalServeMatchId: Joi.number().required(),
      goalServeLeagueId: Joi.number().required(),
      dateTimeUtc: Joi.string().required(),
      leagueType: Joi.string().required(),
    },
    id: Joi.number().required(),
  }),
};
export default {
  createPrivateChannel,
  addUserToPrivateChannel,
  updatePrivateChannel,
  updateHeader,
};
