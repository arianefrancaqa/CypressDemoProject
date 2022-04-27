import supertest from 'supertest';
import Joi from 'joi';
import chai from 'chai';
import joiAssert from 'joi-assert';

global.Joi = Joi;
global.joiAssert = joiAssert;
global.chai = chai;
global.request = supertest("https://jsonplaceholder.typicode.com");