import express from 'express';
import cors from 'cors';
import joi from 'joi';
import dayjs from 'dayjs';
import connection from './database/database.js';

const SERVER_PORT = 4000;

const app = express();

app.use(cors());
app.use(express.json());

const insertGameRules = joi.object({
	name: joi.string().required(),
	image: joi.string().uri().required().allow(''),
	stockTotal: joi.number().min(1).required(),
	categoryId: joi.number().required(),
	pricePerDay: joi.number().min(1).required()
});

const insertCustomerRules = joi.object({
	name: joi.string().required(),
	phone: joi.string().regex(/^[0-9]{10,11}$/).required(),
	cpf: joi.string().regex(/^[0-9]{11}$/).required(),
	birthday: joi.date().max(dayjs().format('YYYY-MM-DD'))
});

app.get('/check-server', (req, res) => {
	res.status(200).send("Rodando plenamente ou talvez.");
});

//List Categories//
app.get('/categories', async (req, res) => {
	try {
		const result = await connection.query("SELECT * FROM categories;");

		if (result.rows.length === 0) {
			res.send("Lista de categorias vazia.");
			return;
		}
		res.status(200).send(result.rows);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//Insert Category//
app.post('/categories', async (req, res) => {
	try {
		const categoryName = req.body.name;

		if (!categoryName) return res.sendStatus(400);

		const hasCategory = await connection.query("SELECT * FROM categories WHERE name = $1", [categoryName]);

		if (hasCategory.rowCount > 0) return res.sendStatus(409);

		await connection.query("INSERT INTO categories (name) VALUES ($1)", [categoryName]);
		res.sendStatus(201);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//List Games//
app.get('/games', async (req, res) => {
	try {
		const { name } = req.query;
		let result;
		if (name) {
			result = await connection
				.query(`SELECT * FROM games WHERE name ILIKE $1`,
					['%' + name + '%']);
		} else {
			result = await connection.query("SELECT * FROM games;");
		}

		if (result.rowCount === 0) return res.send("Lista de jogos vazia.");
		res.status(200).send(result.rows);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//Insert Game//
app.post('/games', async (req, res) => {
	try {
		const { name, image, stockTotal, categoryId, pricePerDay } = req.body;

		const errors = insertGameRules.validate(req.body).error;
		if (errors) {
			console.log(errors);
			return res.sendStatus(400);
		}

		const hasGame = await connection.query("SELECT * FROM games WHERE name = $1", [name]);
		if (hasGame.rowCount > 0) return res.sendStatus(409);

		await connection.query(`
			INSERT INTO 
			games (name, image, "stockTotal", "categoryId", "pricePerDay") 
			VALUES ($1, $2, $3, $4, $5)`
			, [name, image, stockTotal, categoryId, pricePerDay]);
		res.sendStatus(201);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//Insert Customer//
app.post('/customers', async (req, res) => {
	try {
		const { name, phone, cpf, birthday } = req.body;

		const errors = insertCustomerRules.validate(req.body).error;
		if (errors) {
			console.log(errors);
			return res.sendStatus(400);
		}

		const hasCPF = await connection.query("SELECT * FROM customers WHERE cpf = $1", [cpf]);
		if (hasCPF.rowCount > 0) return res.sendStatus(409);

		await connection.query(`
			INSERT INTO 
			customers (name, phone, cpf, birthday) 
			VALUES ($1, $2, $3, $4)`
			, [name, phone, cpf, birthday]);
		res.sendStatus(201);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});


app.listen(SERVER_PORT, () => {
	console.log(`Server is listening on port ${SERVER_PORT}.`);
});
