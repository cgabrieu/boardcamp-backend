import express from 'express';
import connection from './database/database.js';

const SERVER_PORT = 4000;

const app = express();
app.use(express.json());

app.get('/check-server', async (req, res) => {
    res.status(200).send("Rodando plenamente ou talvez.");
});

app.listen(SERVER_PORT, () => {
  console.log(`Server is listening on port ${SERVER_PORT}.`);
});
