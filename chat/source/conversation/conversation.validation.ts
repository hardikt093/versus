import Joi from "@hapi/joi";

const createMessage = {
  body: Joi.object().keys({
    text: Joi.string().required(),
    conversationId: Joi.number().required(),
  }),
};
export default { createMessage };
