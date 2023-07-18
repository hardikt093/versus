import Joi from "@hapi/joi";

const createMessage = {
  body: Joi.object().keys({
    text: Joi.string().required(),
    conversationId: Joi.number().required(),
  }),
};

const getMatchPublicChannelConversation = {
  body: Joi.object().keys({
    goalServeLeagueId: Joi.number().required(),
    goalServeMatchId: Joi.number().required(),
  }),
};
export default { createMessage, getMatchPublicChannelConversation };
