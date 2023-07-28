import Joi from "@hapi/joi";
const createOneToOneChannel = {
  body: Joi.object().keys({
    users: Joi.array().items(Joi.number()).required(),
  }),
};
export default {
  createOneToOneChannel,
};
