import express from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import connection from './database/database.js';
import * as rule from './rule/rule.js'

const SERVER_PORT = 4000;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/check-server', (req, res) => {
	res.status(200).send("Rodando plenamente ou deveria.");
});

async function getResult(query, table) {
	const { offset, limit, order, desc } = query;

	let descOrAsc = 'ASC';
	if (desc) {
		descOrAsc = (desc === "true") ? 'DESC' : 'ASC';
	}

	const acceptValues = ['id','customerId','gameId','name', 'daysRented', 'ASC', 'DESC'];
	if (order) {
		return await connection.query(`
				SELECT * FROM ${table} 
				ORDER BY ${acceptValues.find(e => e === order)} ${acceptValues.find(e => e === descOrAsc)}
				LIMIT $1 OFFSET $2;`,
			[limit, offset]
		);
	}
	return await connection.query(`
		SELECT * FROM ${table} 
		LIMIT $1 OFFSET $2;`,
		[limit, offset]
	);	
}

//List Categories//
app.get('/categories', async (req, res) => {
	try {
		const result = await getResult(req.query, "categories");
		if (result.rowCount === 0) return res.send("Lista de categorias vazia.");
		
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
			result = await getResult(req.query, "games");
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

		const errors = rule.insertGame.validate(req.body).error;
		if (errors) {
			console.log(errors);
			return res.sendStatus(400);
		}

		const hasGame = await connection.query("SELECT * FROM games WHERE name = $1", [name]);
		if (hasGame.rowCount > 0) return res.sendStatus(409);

		await connection.query(`
			INSERT INTO 
			games (name, image, "stockTotal", "categoryId", "pricePerDay") 
			VALUES ($1, $2, $3, $4, $5)`,
			[name, image, stockTotal, categoryId, pricePerDay]
		);
		res.sendStatus(201);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//List Customers//
app.get('/customers', async (req, res) => {
	try {
		const { cpf } = req.query;
		let result;
		if (cpf) {
			result = await connection
				.query(`SELECT * FROM customers WHERE cpf ILIKE $1`,
					[cpf + '%']);
		} else {
			result = await getResult(req.query, "customers");
		}

		if (result.rowCount === 0) return res.send("Lista de clientes vazia.");
		res.status(200).send(result.rows);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//Get customer by id//
app.get("/customers/:id", async (req, res) => {
	try {
		const id = parseInt(req.params.id);
		const result = await connection
			.query(`SELECT * FROM customers WHERE id = $1`, [id]);

		if (result.rowCount > 0) res.send(result.rows[0]);
		else res.sendStatus(404);

	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//Insert Customer//
app.post('/customers', async (req, res) => {
	try {
		const { name, phone, cpf, birthday } = req.body;

		const errors = rule.insertOrUpdateCustomer.validate(req.body).error;
		if (errors) {
			console.log(errors);
			return res.sendStatus(400);
		}

		const hasCPF = await connection.query("SELECT * FROM customers WHERE cpf = $1", [cpf]);
		if (hasCPF.rowCount > 0) return res.sendStatus(409);

		await connection.query(`
			INSERT INTO 
			customers (name, phone, cpf, birthday) 
			VALUES ($1, $2, $3, $4)`,
			[name, phone, cpf, birthday]
		);
		res.sendStatus(201);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//Update Customer//
app.put('/customers/:id', async (req, res) => {
	try {
		const id = parseInt(req.params.id);
		const { name, phone, cpf, birthday } = req.body;
		const errors = rule.insertOrUpdateCustomer.validate(req.body).error;

		if (errors) {
			console.log(errors);
			return res.sendStatus(400);
		}

		await connection.query(`
			UPDATE customers 
			SET name = $1, phone = $2, cpf = $3, birthday = $4 
			WHERE id = $5`,
			[name, phone, cpf, birthday, id]
		);
		res.sendStatus(200);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//List Rentals//
app.get('/rentals', async (req, res) => {
	try {
		const { customerId, gameId, offset, limit } = req.query;

		let query = `
			SELECT rentals.*, 
				customers.name AS "customerName", 
				games.name AS "gameName", 
				categories.id AS "categoryId", 
				categories.name AS "categoryName" 
			FROM rentals 
			JOIN customers ON rentals."customerId" = customers.id 
			JOIN games ON rentals."gameId" = games.id 
			JOIN categories ON games."categoryId" = categories.id 
		`;

		let params = [];
		let result;
		if (customerId && gameId) {
			query += ` WHERE "customerId" = $1 AND "gameId" = $2`;
			params.push(customerId, gameId);
		} else if (customerId) {
			query += ` WHERE "customerId" = $1`;
			params.push(customerId);
		} else if (gameId) {
			query += ` WHERE "gameId" = $1`;
			params.push(gameId);
		}

		if (offset && limit) {
			query += ` LIMIT $${params.length+1} OFFSET $${params.length+2}`;
			result = await connection.query(query, [...params, limit, offset]);
		} else if (offset) {
			query += ` OFFSET $${params.length+1}`;
			result = await connection.query(query, [...params, offset]);
		} else if (limit) {
			query += ` LIMIT $${params.length+1}`;
			result = await connection.query(query, [...params, limit]);
		} else {
			result = await connection.query(query, params);
		}

		if (result.rowCount === 0) return res.send("Lista de alugueis vazia.");

		result.rows.forEach((row) => {
			row.customer = {
				id: row.customerId,
				name: row.customerName
			}
			row.game = {
				id: row.gameId,
				name: row.gameName,
				categoryId: row.categoryId,
				categoryName: row.categoryName
			}
			delete row.categoryId;
			delete row.categoryName;
			delete row.customerName;
			delete row.gameName;
		});
		res.send(result.rows);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//Insert Rental//
app.post('/rentals', async (req, res) => {
	try {
		const { customerId, gameId, daysRented } = req.body;

		const customer = await connection.query("SELECT * FROM customers WHERE id = $1", [customerId]);
		const game = await connection.query("SELECT * FROM games WHERE id = $1", [gameId]);
		const openRentalsGame = await connection.query(`
            SELECT * FROM rentals 
            WHERE "gameId" = $1 
            AND "returnDate" IS NULL`,
			[gameId]
		);

		if (customer.rowCount === 0 || game.rowCount === 0 || openRentalsGame.rowCount >= game.rows[0].stockTotal || daysRented < 1)
			return res.sendStatus(400);

		await connection.query(`
			INSERT INTO rentals 
			("customerId", "gameId", "rentDate", "daysRented", "originalPrice", "returnDate", "delayFee") 
			VALUES ($1, $2, NOW(), $3, $4, NULL, NULL)`,
			[customerId, gameId, daysRented, (game.rows[0].pricePerDay * daysRented)]
		);
		res.sendStatus(201);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//Insert Finish Rental//
app.post('/rentals/:id/return', async (req, res) => {
	try {
		const id = parseInt(req.params.id);

		const result = await connection.query(`
            SELECT rentals."rentDate", rentals."daysRented", games."pricePerDay"
            FROM rentals
            JOIN games ON games.id = rentals."gameId"
            WHERE rentals.id = $1;
        `, [id]);

		if (result.rowCount === 0) return res.sendStatus(404);

		const isReturned = await connection.query(`
			SELECT * FROM rentals
			WHERE id = $1
			AND "returnDate" IS NOT NULL`,
			[id]
		);

		if (isReturned.rowCount > 0) return res.sendStatus(400);

		const { rentDate, daysRented, pricePerDay } = result.rows[0];

		const duration = dayjs().diff(rentDate, "day");
		let delayFee = null;
		if (duration > daysRented) delayFee = (duration - daysRented) * pricePerDay;

		await connection.query(`
            UPDATE rentals
            SET "returnDate" = NOW(), "delayFee" = $1
            WHERE id = $2`,
			[delayFee, id]
		);
		res.sendStatus(200);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

//Remove Rental//
app.delete("/rentals/:id", async (req, res) => {
	try {
		const id = parseInt(req.params.id);

		const hasRental = await connection.query(`
            SELECT * FROM rentals WHERE rentals.id = $1;`,
			[id]
		);

		if (hasRental.rowCount === 0) return res.sendStatus(404);

		const isReturned = await connection.query(`
			SELECT * FROM rentals 
			WHERE id = $1 
			AND "returnDate" IS NOT NULL`,
			[id]
		);

		if (isReturned.rowCount > 0) return res.sendStatus(400);

		await connection.query(`
			DELETE FROM rentals WHERE id = $1`,
			[id]
		);
		res.sendStatus(200);
	} catch (error) {
		console.log(error);
		res.sendStatus(500);
	}
});

app.listen(SERVER_PORT, () => {
	console.log(`Server is listening on port ${SERVER_PORT}.`);
});