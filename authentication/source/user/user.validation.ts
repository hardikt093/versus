import Joi from "@hapi/joi";

const profileUpdate = {
  body: Joi.object().keys({
    firstName: Joi.string().allow(null, ""),
    lastName: Joi.string().allow(null, ""),
    userName: Joi.string().allow(null, ""),
    profileImage: Joi.string().allow(null, ""),
    phone: Joi.object().allow(null, ""),
    venmoUserName: Joi.string().allow(null, ""),
  }),
};

export default { profileUpdate };
