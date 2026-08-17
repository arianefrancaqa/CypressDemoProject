const Joi = require('joi');

const signinSchema = Joi.object({
    id: Joi.number().required(),
    nome: Joi.string().required(),
    token: Joi.string().required()
}).required();

export { signinSchema }
