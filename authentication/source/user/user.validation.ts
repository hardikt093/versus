import Joi from "@hapi/joi";

const profileUpdate = {
  body: Joi.object().keys({
    firstName: Joi.string(),
    lastName: Joi.string(),
    userName: Joi.string(),
    profileImage: Joi.string(),
    birthDate: Joi.string(),
  }),
};

export default { profileUpdate };
