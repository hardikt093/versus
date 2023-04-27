import Joi from "@hapi/joi";

const signIn = {
  body: Joi.object().keys({
    userNameEmail: Joi.string().allow(null, ""),
    password: Joi.string().allow(null, ""),
    token: Joi.string().allow(null, ""),
    provider: Joi.string().allow(null, ""),
    email: Joi.string().allow(null, ""),
    socialLogin: Joi.boolean().allow(null, ""),
    firstName: Joi.string().allow(null, ""),
    lastName: Joi.string().allow(null, ""),
    googleCode: Joi.string().allow(null, ""),
  }),
};

const signUp = {
  body: Joi.object().keys({
    email: Joi.string().allow(null, ""),
    password: Joi.string().allow(null, ""),
    firstName: Joi.string().allow(null, ""),
    lastName: Joi.string().allow(null, ""),
    userName: Joi.string().allow(null, ""),
    phone: Joi.object().allow(null, ""),
    countryCode: Joi.string().allow(null, ""),
    socialLogin: Joi.boolean(),
    birthDate: Joi.string().allow(null, ""),
    profileImage: Joi.string().allow(null, ""),
    userId: Joi.number().allow(null, ""),
    isSignUp: Joi.string().allow(null, ""),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().required(),
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    id: Joi.string(),
    password: Joi.string(),
  }),
};

export default {
  signIn,
  signUp,
  forgotPassword,
  resetPassword,
};
