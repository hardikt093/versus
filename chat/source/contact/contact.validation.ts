import Joi from "@hapi/joi";

const createContact = {
  body: Joi.object().keys({
    email: Joi.string().required(),
  }),
};
export default { createContact };
