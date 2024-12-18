const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
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

// Configura el backoff exponencial (tiempo de reconexión que aumenta con cada intento fallido)
let reconnectAttempts = 0;
const maxReconnectAttempts = 10; // Número máximo de intentos de reconexión antes de rendirse

// Función para reconectar en caso de pérdida de conexión
const reconnect = async () => {
  try {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('Número máximo de intentos de reconexión alcanzado. La aplicación se detendrá.');
      process.exit(1); // Termina el proceso si alcanza el número máximo de intentos
    }

    // Aumentamos el número de intentos y el tiempo de espera entre ellos
    reconnectAttempts++;
    const waitTime = Math.pow(2, reconnectAttempts) * 1000; // Backoff exponencial (segundos convertidos a milisegundos)
    console.log(`Intentando reconectar... (Intento ${reconnectAttempts})`);

    setTimeout(async () => {
      try {
        // Intentar conectar nuevamente
        await client.connect();
        console.log('Reconexión exitosa a MongoDB');
        reconnectAttempts = 0; // Restablecer los intentos de reconexión
      } catch (error) {
        console.error('Error al reconectar a MongoDB:', error.message);
        reconnect(); // Si la reconexión falla, intentar nuevamente
      }
    }, waitTime);
  } catch (error) {
    console.error('Error al intentar reconectar:', error);
  }
};

// Verificación continua del estado de la conexión
const checkConnection = async () => {
  try {
    const admin = client.db().admin();
    const { ok } = await admin.ping();

    if (ok === 1) {
      console.log('MongoDB está operativo');
      reconnectAttempts = 0; // Restablecer los intentos de reconexión si la conexión es exitosa
    } else {
      console.error('No se recibió respuesta de MongoDB');
      reconnect(); // Intentar reconectar si la conexión no es exitosa
    }
  } catch (error) {
    console.error('Error al verificar el estado de la base de datos:', error);
    reconnect(); // Intentar reconectar si hay un error al verificar el estado
  }
};

// Función principal para iniciar la conexión y verificar el estado
const startDbConnection = async () => {
  try {
    await client.connect(); // Intentar conectar al inicio
    console.log('Conexión exitosa a MongoDB');

    // Verificar la conexión cada 10 segundos
    setInterval(checkConnection, 10000); // Cada 10 segundos
  } catch (error) {
    console.error('Error inicial al conectar a MongoDB:', error.message);
    reconnect(); // Si la conexión inicial falla, intentar reconectar
  }
};

// Iniciar la conexión y monitoreo
startDbConnection();

module.exports = client;
