import Joi from "@hapi/joi";

const createPrivateChannel = {
  body: Joi.object().keys({
    channelName: Joi.string().max(30).required(),
    channelType: Joi.string().required(),
  }),
};
const addUserToPrivateChannel = {
    body: Joi.object().keys({
      userId: Joi.array().items(Joi.number()),
      channelId: Joi.number().required(),
    }),
  };
export default { createPrivateChannel,addUserToPrivateChannel };