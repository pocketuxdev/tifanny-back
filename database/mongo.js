const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  // En desarrollo usamos la misma conexión para todas las invocaciones
  if (global._mongoClientPromise) {
    clientPromise = global._mongoClientPromise;
  } else {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      waitQueueTimeoutMS: 5000,
    });

    global._mongoClientPromise = client.connect();
    clientPromise = global._mongoClientPromise;
  }
} else {
  // En producción (por ejemplo, en Vercel), no usar el caché
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 1,
    waitQueueTimeoutMS: 5000,
  });

  clientPromise = client.connect();
}

const validatedb = async () => {
  try {
    await clientPromise; // Conexión usando la promesa almacenada
    console.log('Conexión exitosa a MongoDB');

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
