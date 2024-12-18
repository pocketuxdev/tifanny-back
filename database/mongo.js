const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;

// Configuración del cliente MongoDB sin `useUnifiedTopology`
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 10000, // Tiempo máximo para conectar (10 segundos)
  socketTimeoutMS: 45000, // Tiempo de espera para sockets (45 segundos)
  maxPoolSize: 10, // Número máximo de conexiones simultáneas
  minPoolSize: 1, // Número mínimo de conexiones en el pool
  waitQueueTimeoutMS: 5000, // Tiempo máximo para esperar por una conexión en el pool
});

const validatedb = async () => {
  try {
    await client.connect(); // Conexión al cliente
    console.log('Conexión exitosa a MongoDB');
    // Validar conexión a la base de datos
    const admin = client.db().admin();
    const { ok } = await admin.ping();
    if (ok === 1) {
      console.log('MongoDB está operativo');
    } else {
      throw new Error('No se recibió respuesta de MongoDB');
    }
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
  }
};

validatedb();

module.exports = client;
