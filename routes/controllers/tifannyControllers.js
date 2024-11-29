const pool = require('../../database/mongo')
const axios = require('axios');
const moment = require('moment-timezone');
const newClientapi = async (req, res) => {
    const datos = req.body;
  
    const generateApiKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let apiKey = '';
      for (let i = 0; i < 10; i++) {
        apiKey += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return apiKey;
    };
  
    const generateClientWebhook = (apiKey) => {
      const baseUrl = 'https://api.tiffany.com/webhooks';
      return `${baseUrl}/${apiKey}`;
    };
  
    try {
      const collection = pool.db('tifanny').collection('clients');
      const existingClient = await collection.findOne({ id: datos.id });
  
      // Si el cliente ya existe, retornamos un mensaje y no continuamos con la creación
      if (existingClient) {
        console.log("Cliente con esta cédula ya existe.");
        // Puedes agregar una notificación aquí a Tiffany sin detener el flujo.
        const existingClientWebhook = generateClientWebhook(existingClient.apiKey);
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
        try {
          await axios.post(tiffanyWebhook, {
            message: "Cliente ya existe, no se crea nuevo.",
            clientWebhook: existingClientWebhook
          });
        } catch (webhookError) {
          console.error('Error al enviar el webhook a Tiffany:', webhookError.message);
        }
  
        return res.status(409).json({ message: "El cliente con esta cédula ya existe." }); // Respondemos con un 409 Conflict
      }
  
      const apiKey = generateApiKey();
      const clientWebhook = generateClientWebhook(apiKey);
  
      const newClientData = {
        fullName: datos.fullName || null,
        email: datos.email || null,
        id: datos.id || null,
        phone: datos.phone || null,
        apiKey,
        webhook: clientWebhook,
        webhookInternal: datos.webhookInternal || null,
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
  
      const result = await collection.insertOne(newClientData);
  
      if (result.acknowledged) {
        const createdClient = await collection.findOne({ _id: result.insertedId });
  
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
  
        // Notificar a Tiffany
        try {
          await axios.post(tiffanyWebhook, {
            message: "Cliente creado con éxito",
            clientWebhook: createdClient.webhook
          });
        } catch (webhookError) {
          console.error('Error al enviar el webhook a Tiffany:', webhookError.message);
        }
  
        return res.status(201).json({
          message: "Cliente creado con éxito.",
          client: createdClient
        });
      }
  
      return res.status(500).json({ message: "Error al insertar el cliente en la base de datos." });
    } catch (error) {
      console.error('Error al crear el cliente:', error);
      return res.status(500).json({
        message: "Error interno del servidor.",
        error: error.message
      });
    }
  };
  
  
  module.exports = {
    newClientapi
  };