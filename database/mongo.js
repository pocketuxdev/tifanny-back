const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;

// Initialize the client once
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 10000, // Tiempo máximo para conectar (10 segundos)
  socketTimeoutMS: 45000, // Tiempo de espera para sockets (45 segundos)
  maxPoolSize: 10, // Número máximo de conexiones en el pool
  minPoolSize: 1, // Número mínimo de conexiones en el pool
  waitQueueTimeoutMS: 5000, // Tiempo máximo para esperar por una conexión en el pool
});

let isConnected = false;

// Function to ensure connection and return the database instance
async function getDb() {
  if (!isConnected) {
    try {
      // Add event listener for topology closure to reset isConnected *before* connecting
      // This handles cases where the connection might have dropped since the last check
      client.once('topologyClosed', () => {
        console.log("MongoDB topology closed event detected, resetting connection status.");
        isConnected = false;
      });
      
      await client.connect();
      isConnected = true;
      console.log("MongoDB connected successfully for this invocation.");
      
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      isConnected = false; // Ensure status is false if connection fails
      // Re-throw the error or handle it as appropriate for your application
      throw error;
    }
  }
  // Return the default database instance
  // Ensure your MONGO_URI includes the database name, or specify it here:
  // e.g., return client.db("your_db_name")
  return client.db(); 
}

// Export the function to get the DB, not the client directly
module.exports = { getDb };

/* 
// Old connection logic removed:
// Configura el backoff exponencial...
// Función para reconectar...
// Verificación continua...
// Función principal para iniciar la conexión...
// startDbConnection();
// module.exports = client;
*/
