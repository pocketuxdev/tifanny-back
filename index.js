const express = require('express');
const { urlencoded, json } = require('express');
const router = require('./routes/tifanny.routes.js');
const cors = require('cors');
const pool = require('./database/mongo');
require('dotenv').config();

const app = express();

// Configuración específica de CORS
const corsOptions = {
    origin: ['http://localhost:5001', 'http://0.0.0.0:5001'], // Permitir ambas URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true, // Permite credenciales
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(urlencoded({ extended: true }));
app.use(json());

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