const express = require('express');
const { urlencoded, json } = require('express');
const router = require('./routes/tifanny.routes.js');
const cors = require('cors');
const pool = require('./database/mongo');
require('dotenv').config();

const app = express();

// Configuración específica de CORS
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? [
            'https://www.tiffany.cool',
            'https://tiffany.cool',
            'https://prueba-orcin-phi.vercel.app',
            'https://www.prueba-orcin-phi.vercel.app',
            'https://homejs.vercel.app',
            'https://www.homejs.vercel.app'
          ]
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true,
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