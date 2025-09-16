const app = require('./app');
const { connectDB } = require('./src/config/database');

async function main() {
    try {

    await connectDB();

    app.listen(4000, () => {
        console.log(
        `> Servidor local (Para desarrollo): http://localhost:${4000}`
        );
    });
    } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    }
}

main();