const { Client, Pool } = require('pg');

const client = new Client({
	user: process.env.RDS_USERNAME,
	host: process.env.RDS_HOSTNAME,
	database: process.env.RDS_DB_NAME,
	password: process.env.RDS_PASSWORD,
	port: process.env.RDS_PORT
});

const pool = new Pool({
	user: process.env.RDS_USERNAME,
	host: process.env.RDS_HOSTNAME,
	database: process.env.RDS_DB_NAME,
	password: process.env.RDS_PASSWORD,
	port: process.env.RDS_PORT
});

module.exports = { client, pool };
