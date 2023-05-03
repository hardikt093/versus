import Joi from "@hapi/joi";

const scoreWithDate = {
    query: Joi.object().keys({
        date1: Joi.string().required()
    }),
};
export default { scoreWithDate }