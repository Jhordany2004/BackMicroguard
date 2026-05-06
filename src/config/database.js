const { Pool } = require("pg");
require("dotenv").config();

const usarSSL = process.env.PGSSL === "true";

const pool = new Pool(
    process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: usarSSL ? { rejectUnauthorized: false } : false
        }
        : {
            host: process.env.PGHOST || "localhost",
            port: Number(process.env.PGPORT) || 5432,
            database: process.env.PGDATABASE,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            ssl: usarSSL ? { rejectUnauthorized: false } : false
        }
);

async function connectDB() {
    if (!process.env.DATABASE_URL && !process.env.PGDATABASE) {
        throw new Error("Configura DATABASE_URL o PGDATABASE en el archivo .env");
    }

    const client = await pool.connect();

    try {
        await client.query("SELECT NOW()");
        console.log("Conectado exitosamente a PostgreSQL");
    } finally {
        client.release();
    }
}

module.exports = {
    connectDB,
    pool,
    query: (text, params) => pool.query(text, params)
};
