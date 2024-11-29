const pool = require('../../database/mongo')
const axios = require('axios');
const moment = require('moment-timezone');


// Modificación del código para asegurarse de que 'webhookInternal' quede vacío si no se pasa en los datos
const newClientapi = async (req, res) => {
    const datos = req.body;
  
    // Función para generar una API key única de 10 caracteres (solo letras mayúsculas y minúsculas)
    const generateApiKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      let apiKey = '';
      for (let i = 0; i < 10; i++) {
        apiKey += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return apiKey;
    };
  
    // Función para generar un webhook único para el cliente usando su API key
    const generateClientWebhook = (apiKey) => {
      const baseUrl = 'https://api.tiffany.com/webhooks'; // Base para los webhooks de clientes
      return `${baseUrl}/${apiKey}`;
    };
  
    try {
      // Verificar si la colección 'clients' existe, si no, crearla
      const collection = pool.db('pocketux').collection('clients');
  
      // Verificar si el cliente ya existe usando el campo "id" (cédula)
      const existingClient = await collection.findOne({ id: datos.id });
  
      if (existingClient) {
        // Si el cliente ya existe, enviar un mensaje de éxito a Tiffany
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc'; 
  
        try {
          await axios.post(tiffanyWebhook, { 
            message: "El cliente ya está registrado con éxito", 
            clientWebhook: existingClient.webhook 
          });
        } catch (webhookError) {
          console.error('Error al enviar el webhook a Tiffany:', webhookError.message);
        }
  
        return res.status(201).json({ 
          message: "Cliente ya existe, pero se procesa correctamente.", 
          client: { ...existingClient } 
        });
      }
  
      // Generar la API Key
      const apiKey = generateApiKey();
  
      // Generar el webhook único para el cliente usando su API key
      const clientWebhook = generateClientWebhook(apiKey);
  
      // Crear la estructura del cliente
      const newClientData = {
        fullName: datos.fullName || null,
        email: datos.email || null,
        id: datos.id || null,
        phone: datos.phone || null,
        apiKey,
        webhook: clientWebhook,
        webhookInternal: datos.webhookInternal || null,  // Aquí se toma directamente desde la solicitud
        wallets: datos.wallets || [],
        address: {
          street: datos.address?.street || null,
          city: datos.address?.city || null,
          state: datos.address?.state || null,
          postalCode: datos.address?.postalCode || null,
          country: datos.address?.country || null
        },
        roles: datos.roles || [],
        preferences: {
          language: datos.preferences?.language || null,
          timezone: datos.preferences?.timezone || null,
          notifications: {
            email: datos.preferences?.notifications?.email || null,
            sms: datos.preferences?.notifications?.sms || null,
            push: datos.preferences?.notifications?.push || null
          }
        },
        company: {
          id: datos.company?.id || null,
          name: datos.company?.name || null,
          department: datos.company?.department || null,
          position: datos.company?.position || null,
          roles: datos.company?.roles || [],
          metadata: {
            joinedAt: datos.company?.metadata?.joinedAt || null,
            addedBy: datos.company?.metadata?.addedBy || null
          }
        },
        metadata: {
          createdBy: datos.metadata?.createdBy || "admin",
          createdAt: datos.metadata?.createdAt || new Date()
        }
      };
      // Insertar el nuevo cliente en la base de datos
      await collection.insertOne(newClientData);
  
      // Enviar un mensaje a Tiffany con los detalles del nuevo cliente
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc'; 
      try {
        await axios.post(tiffanyWebhook, { 
          message: "Nuevo cliente registrado exitosamente",
          clientWebhook: clientWebhook
        });
      } catch (webhookError) {
        console.error('Error al enviar el webhook a Tiffany:', webhookError.message);
      }
  
      return res.status(200).json({ 
        message: "Cliente registrado con éxito", 
        client: newClientData 
      });
    } catch (error) {
      console.error('Error al crear el cliente:', error.message);
      return res.status(500).json({ message: 'Error al crear el cliente', error: error.message });
    }
  };
  
  const getAllClientsapi = async (req, res) => {
    try {
      // Conectarse a la colección 'clients' en la base de datos 'pocketux'
      const collection = pool.db('pocketux').collection('clients');
      
      // Obtener todos los clientes registrados en la colección
      const clients = await collection.find({}).toArray();
  
      // Verificar si se encontraron clientes
      if (clients.length === 0) {
        return res.status(201).json({ message: "No se pudo encontrar los clientes." });
      }
  
      // Enviar mensaje de éxito al webhook de Tiffany
      const webhookUrl = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc'; 
  
      try {
        await axios.post(webhookUrl, { message: "Clientes encontrados con éxito", data: clients });
      } catch (webhookError) {
        console.error('Error al enviar el webhook a Tiffany:', webhookError.message);
      }
  
      // Retornar los clientes encontrados como respuesta
      res.status(200).json({ 
        message: "Clientes encontrados con éxito.", 
        clients 
      });
    } catch (error) {
      console.error('Error al obtener los clientes:', error);
      res.status(500).json({ 
        message: "Error interno del servidor.", 
        error: error.message 
      });
    }
  };
  
  
  module.exports = {
    newClientapi,
    getAllClientsapi
  };