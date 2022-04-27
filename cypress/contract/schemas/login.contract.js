const Joi = require('joi');

const loginSchema = Joi.object({
    id: Joi.number().integer().required(),
    nome: Joi.string().required(),
    id_telegram: Joi.string().allow(null),
    email: Joi.string().required(),
    senha: Joi.string().required(),
    created_at: Joi.string().required(),
    updated_at: Joi.string().required()
}).required();

export { loginSchema }