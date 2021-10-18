import joi from "joi";
import dayjs from "dayjs";

const insertGame = joi.object({
	name: joi.string().required(),
	image: joi.string().uri().required().allow(''),
	stockTotal: joi.number().min(1).required(),
	categoryId: joi.number().required(),
	pricePerDay: joi.number().min(1).required()
});

const insertOrUpdateCustomer = joi.object({
	name: joi.string().required(),
	phone: joi.string().regex(/^[0-9]{10,11}$/).required(),
	cpf: joi.string().regex(/^[0-9]{11}$/).required(),
	birthday: joi.date().max(dayjs().format('YYYY-MM-DD'))
});

export {
    insertGame,
    insertOrUpdateCustomer
}