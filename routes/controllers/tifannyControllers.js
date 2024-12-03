const pool = require('../../database/mongo')
const axios = require('axios');
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');

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
  const getClientByCriteriaapi = async (req, res) => {
    const { id, phone, email, fullName, companyName, companyId } = req.query; // Obtener parámetros de la query
  
    try {
      // Verificar que al menos uno de los parámetros esté presente
      if (!id && !phone && !email && !fullName && !companyName && !companyId) {
        return res.status(201).json({ 
          message: "Debe proporcionar al menos uno de los siguientes parámetros: id, phone, email, fullName, companyName, companyId.", 
          success: false 
        });
      }
  
      // Crear un objeto con los filtros basados en los parámetros recibidos
      const filters = {};
      if (id) filters.id = id;
      if (phone) filters.phone = phone;
      if (email) filters.email = email;
      if (fullName) filters.fullName = { $regex: fullName, $options: 'i' }; // Búsqueda insensible a mayúsculas
      if (companyName) filters['company.name'] = { $regex: companyName, $options: 'i' }; // Búsqueda insensible a mayúsculas
      if (companyId) filters['company.id'] = companyId;
  
      // Conectarse a la colección 'clients' en la base de datos 'pocketux'
      const collection = pool.db('pocketux').collection('clients');
  
      // Buscar el cliente con los filtros aplicados
      const client = await collection.findOne(filters);
  
      // Verificar si se encontró el cliente
      if (!client) {
        // Notificar al webhook
        const webhookUrl = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
        await axios.post(webhookUrl, { 
          message: "Cliente no encontrado con los criterios proporcionados.", 
          success: false 
        }).catch((webhookError) => {
          console.error('Error al enviar el webhook a Tiffany:', webhookError.message);
        });
  
        return res.status(201).json({ 
          message: "Cliente no encontrado con los criterios proporcionados.", 
          success: false 
        });
      }
  
      // Enviar mensaje de éxito al webhook de Tiffany
      const webhookUrl = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(webhookUrl, { 
        message: "Cliente encontrado con éxito", 
        data: client, 
        success: true 
      }).catch((webhookError) => {
        console.error('Error al enviar el webhook a Tiffany:', webhookError.message);
      });
  
      // Retornar el cliente encontrado como respuesta
      return res.status(200).json({ 
        message: "Cliente encontrado con éxito.", 
        success: true, 
        client 
      });
    } catch (error) {
      // Manejar errores como mensajes
      console.error('Error al obtener el cliente:', error);
  
      // Notificar al webhook del error sin interrumpir
      const webhookUrl = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(webhookUrl, { 
        message: "Error al procesar la solicitud de cliente.", 
        error: error.message, 
        success: false 
      }).catch((webhookError) => {
        console.error('Error al enviar el webhook a Tiffany:', webhookError.message);
      });
  
      // Retornar mensaje de error
      return res.status(202).json({ 
        message: "Error al procesar la solicitud de cliente.", 
        success: false 
      });
    }
  };

  const updateClientapi = async (req, res) => {
    const { id } = req.params; // Cédula o ID del cliente
    const newData = req.body; // Datos nuevos que se desean actualizar
  
    try {
      // Conexión a las colecciones 'clients' y 'clientChangesLog'
      const clientsCollection = pool.db('pocketux').collection('clients');
      const changesLogCollection = pool.db('pocketux').collection('clientChangesLog');
  
      // Obtener los datos actuales del cliente
      const existingClient = await clientsCollection.findOne({ id });
  
      if (!existingClient) {
        // Notificar al webhook
        const webhookUrl = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
        await axios.post(webhookUrl, { 
          message: "Cliente no encontrado.", 
          success: false 
        }).catch((webhookError) => {
          console.error('Error al enviar el webhook:', webhookError.message);
        });
  
        return res.status(201).json({ message: "Cliente no encontrado.", success: false });
      }
  
      // Log de los cambios realizados
      const changesLog = [];
  
      // Comparamos los campos nuevos con los actuales y generamos el log
      for (const key in newData) {
        if (newData[key] !== existingClient[key]) {
          changesLog.push({
            field: key,
            oldValue: existingClient[key],
            newValue: newData[key],
            timestamp: new Date().toISOString()
          });
        }
      }
  
      // Si no hubo cambios, devolver un mensaje informativo
      if (changesLog.length === 0) {
        return res.status(201).json({ 
          message: "No hay cambios para actualizar.", 
          success: false 
        });
      }
  
      // Guardar los cambios en la nueva colección de logs
      const logEntry = {
        clientId: id, // ID del cliente
        changes: changesLog, // Cambios realizados
        updatedBy: "admin", // Quién realiza la actualización
        timestamp: new Date().toISOString() // Fecha de la actualización
      };
  
      await changesLogCollection.insertOne(logEntry); // Insertar el log en la nueva colección
  
      // Actualizar el cliente con los nuevos datos
      const updatedClientData = {
        ...existingClient,
        ...newData,
        metadata: {
          ...existingClient.metadata,
          lastUpdatedAt: new Date().toISOString()
        }
      };
  
      // Actualizar los datos del cliente en la colección 'clients'
      const result = await clientsCollection.updateOne({ id }, { $set: updatedClientData });
  
      if (result.modifiedCount > 0) {
        // Enviar mensaje al webhook para notificar el éxito
        const webhookUrl = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc'; 
        await axios.post(webhookUrl, { 
          message: "Cliente actualizado con éxito", 
          success: true 
        }).catch((webhookError) => {
          console.error('Error al enviar el webhook:', webhookError.message);
        });
  
        return res.status(200).json({ 
          message: "Cliente actualizado con éxito.", 
          success: true, 
          updatedClient: updatedClientData 
        });
      } else {
        // Notificar al webhook que no se pudo actualizar el cliente
        const webhookUrl = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc'; 
        await axios.post(webhookUrl, { 
          message: "Error al actualizar el cliente.", 
          success: false 
        }).catch((webhookError) => {
          console.error('Error al enviar el webhook:', webhookError.message);
        });
  
        return res.status(201).json({ 
          message: "Error al actualizar el cliente.", 
          success: false 
        });
      }
    } catch (error) {
      console.error('Error al actualizar el cliente:', error);
  
      // Notificar al webhook del error
      const webhookUrl = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(webhookUrl, { 
        message: "Error interno al procesar la solicitud de actualización.", 
        error: error.message, 
        success: false 
      }).catch((webhookError) => {
        console.error('Error al enviar el webhook:', webhookError.message);
      });
  
      // Retornar mensaje de error
      return res.status(202).json({ 
        message: "Error interno al procesar la solicitud de actualización.", 
        success: false 
      });
    }
  };
  
  const deleteClientapi = async (req, res) => {
    const { id } = req.params;
    const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
    const deletedBy = "admin"; // Usuario que realiza la eliminación (puedes ajustarlo dinámicamente)
  
    try {
      // Conexión a las colecciones
      const clientsCollection = pool.db('pocketux').collection('clients');
      const historyCollection = pool.db('pocketux').collection('clientshistory');
  
      // Buscar al cliente en la colección clients
      const clientToDelete = await clientsCollection.findOne({ id });
  
      if (!clientToDelete) {
        // Notificar a Tiffany sobre la falla
        await axios.post(tiffanyWebhook, { 
          message: "Cliente no encontrado para eliminar", 
          clientId: id,
          success: false 
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
        return res.status(202).json({ 
          message: "Cliente no encontrado para eliminar.", 
          success: false 
        });
      }
  
      // Agregar datos adicionales para el historial
      const clientHistoryData = {
        ...clientToDelete,
        deletedAt: new Date().toISOString(), // Fecha y hora de eliminación
        deletedBy // Quién realizó la eliminación
      };
  
      // Mover el cliente a la colección clientshistory
      const moveToHistory = await historyCollection.insertOne(clientHistoryData);
  
      if (!moveToHistory.acknowledged) {
        // Notificar a Tiffany sobre la falla
        await axios.post(tiffanyWebhook, { 
          message: "Error al mover cliente a clientshistory", 
          clientId: id,
          success: false 
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
        return res.status(202).json({ 
          message: "Error al guardar el cliente en el historial.", 
          success: false 
        });
      }
  
      // Eliminar al cliente de la colección clients
      const deleteFromClients = await clientsCollection.deleteOne({ id });
  
      if (deleteFromClients.deletedCount === 1) {
        // Consultar los datos del cliente en clientshistory
        const clientHistoryRecord = await historyCollection.findOne({ id });
  
        // Filtrar los campos que contienen datos (no son null, undefined o vacíos)
        const clientHistoryDataFiltered = Object.fromEntries(
          Object.entries(clientHistoryRecord).filter(([key, value]) => value != null && value !== '')
        );
  
        // Notificar a Tiffany sobre el éxito y enviar los datos del cliente eliminado
        await axios.post(tiffanyWebhook, { 
          message: "Cliente eliminado con éxito", 
          clientData: clientHistoryDataFiltered, // Datos filtrados del cliente eliminado
          success: true 
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
        return res.status(200).json({ 
          message: "Cliente eliminado con éxito.", 
          success: true,
          clientData: clientHistoryDataFiltered // Devolver los datos del cliente con solo los campos relevantes
        });
      } else {
        // Notificar a Tiffany sobre la falla
        await axios.post(tiffanyWebhook, { 
          message: "Error al eliminar cliente de la colección", 
          clientId: id,
          success: false 
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
        return res.status(202).json({ 
          message: "Error al eliminar el cliente de la colección.", 
          success: false 
        });
      }
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      // Notificar a Tiffany sobre el error
      await axios.post(tiffanyWebhook, { 
        message: "Error interno del servidor al intentar eliminar cliente", 
        clientId: id,
        success: false 
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
      return res.status(202).json({ 
        message: "Error interno del servidor al intentar eliminar cliente.", 
        success: false 
      });
    }
  };

  /*---------------------------------productos--------------------------------------------------------------*/
  
 
  
  const newProductapi = async (req, res) => {
    const { name, description, category, price, availability, tags } = req.body;
  
    // Validación de los datos
    if (!name || !description || !category || !price || !availability || !tags) {
      const message = 'Faltan datos obligatorios en la solicitud.';
      // Notificar a Tiffany sobre el error
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(tiffanyWebhook, { 
        message: message, 
        success: false 
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
      return res.status(400).json({ message, success: false });
    }
  
    try {
      const productsCollection = pool.db('pocketux').collection('products');
      
      // Generar el ID único para el producto
      const newProduct = {
        product_id: uuidv4(),
        name,
        description,
        category,
        price: {
          currency: price.currency || 'USD',
          amount: price.amount || 0
        },
        availability,
        tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
  
      // Insertar el producto en la colección
      const result = await productsCollection.insertOne(newProduct);
  
      if (result.acknowledged) {
        // Notificar a Tiffany sobre el éxito
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
        await axios.post(tiffanyWebhook, { 
          message: "Nuevo producto creado con éxito", 
          productData: newProduct, 
          success: true 
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
        return res.status(201).json({ 
          message: "Nuevo producto creado con éxito.", 
          success: true, 
          product: newProduct 
        });
      } else {
        // Notificar a Tiffany sobre el error al insertar el producto
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
        await axios.post(tiffanyWebhook, { 
          message: "Error al crear el nuevo producto", 
          success: false 
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
        return res.status(500).json({ 
          message: "Error al crear el nuevo producto.", 
          success: false 
        });
      }
    } catch (error) {
      console.error('Error al crear el producto:', error);
  
      // Notificar a Tiffany sobre el error interno
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(tiffanyWebhook, { 
        message: "Error interno al procesar la solicitud de creación de producto.", 
        error: error.message, 
        success: false 
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
      return res.status(500).json({ 
        message: "Error interno al procesar la solicitud de creación de producto.", 
        success: false 
      });
    }
  };
  

  
  
  
  
  module.exports = {
    newClientapi,
    getAllClientsapi,
    getClientByCriteriaapi,
    updateClientapi,
    deleteClientapi,
    newProductapi
  };