const keys = require('./keys');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const redis = require('redis');
const { Pool } = require('pg');

// setup express
const app = express();
app.use(bodyParser.json());
app.use(cors());

// setup postgres
 const pgClient = new Pool({
	 user: keys.pgUser,
	 host: keys.pgHost,
	 database: keys.pgDatabase,
	 password: keys.pgPassword,
	 port: keys.pgPort
 });

 pgClient.on('error', error => console.log('lost pg connection', error));

 pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
 .catch(err => console.log(err));

 //setup redis
 const redisClient = redis.createClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => 1000
});

const redisPublisher  = redisClient.duplicate();

//express routes
app.get('/', (req, res) => {
	res.send('Hi');
});

app.get('/values/all', async (req, res) => {
	const values = await pgClient.query('SELECT * FROM values');
	res.json(values.rows);
});

app.get('/values/current', async (req, res)=> {
	redisClient.hgetall('values', (err, values) =>{
		res.json(values);
	});
});

app.post('/values', async (req, res) => {
	const index = req.body.index;
	if(parseInt(index)>40){
		return res.status(422).send('index too high');
	}
	redisClient.hset('values', index, 'Nothing yet!');
	redisPublisher.publish('insert', index);
	pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
	res.json({ working: 'true'})
});

app.listen(5000, err => {
	console.log('app listening on port 5000')
})

