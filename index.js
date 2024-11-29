const express = require('express');
const { urlencoded, json } = require('express');
const router = require('./routes/tifanny.routes.js');
const cors = require('cors');
const pool = require('./database/mongo');
require('dotenv').config();


const app = express();


// Middleware para analizar datos codificados y JSON
app.use(urlencoded({ extended: true }));
app.use(json());
app.use(cors());

// Manejador para la ruta raíz
app.get('/', (req, res) => {
    res.send('Bienvenido al backend de pocket ux!');
});



app.use('/v1/tifanny', router);

// Iniciar el servidor
const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`);
});