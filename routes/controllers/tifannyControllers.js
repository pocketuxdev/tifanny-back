const pool = require('../../database/mongo')
const axios = require('axios');
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');
const { parsePhoneNumberFromString } = require('libphonenumber-js');




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
  
    // Nueva función para generar contraseña aleatoria
    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
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
  
        // Generar la API Key y la contraseña
        const apiKey = generateApiKey();
        const password = generatePassword();

        // Encriptar la contraseña usando SHA256
        const hashedPassword = CryptoJS.SHA256(password, process.env.CODE_SECRET_DATA).toString();
  
        // Generar el webhook único para el cliente usando su API key
        const clientWebhook = generateClientWebhook(apiKey);
  
        // Crear la estructura del cliente
        const newClientData = {
            fullName: datos.fullName || null,
            email: datos.email || null,
            id: datos.id || null,
            phone: datos.phone || null,
            password: hashedPassword, // Contraseña encriptada
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
            client: {
                ...newClientData,
                password: password // Mostrar la contraseña original solo en la respuesta inicial
            }
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
    const { id, phone, email, fullName, companyName, companyId, password } = req.query; // Agregamos password
  
    try {
      // Verificar que al menos uno de los parámetros esté presente
      if (!id && !phone && !email && !fullName && !companyName && !companyId && !password) {
        return res.status(201).json({ 
          message: "Debe proporcionar al menos uno de los siguientes parámetros: id, phone, email, fullName, companyName, companyId, password.", 
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
      if (password) filters.password = password; // Agregamos búsqueda por password
  
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
  
      // Si se está actualizando la contraseña, la encriptamos
      if (newData.password) {
        const CryptoJS = require('crypto-js');  // Asegúrate de que esté importado
  
        // Encriptar la nueva contraseña
        const hashedPassword = CryptoJS.SHA256(newData.password, process.env.CODE_SECRET_DATA).toString();
        newData.password = hashedPassword;  // Reemplazar la contraseña con la encriptada
      }
  
      // Log de los cambios realizados
      const changesLog = [];
  
      // Comparamos los campos nuevos con los actuales y generamos el log
      for (const key in newData) {
        if (key === 'password') {
          // Para la contraseña solo registramos que fue cambiada, no los valores
          changesLog.push({
            field: key,
            oldValue: '********',
            newValue: '********',
            timestamp: new Date().toISOString()
          });
        } else if (newData[key] !== existingClient[key]) {
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
        // En la respuesta, ocultamos la contraseña, excepto cuando se ha actualizado
        const responseData = {
          ...updatedClientData,
          password: newData.password ? newData.password : '********' // Si la contraseña fue actualizada, la mostramos; de lo contrario, la ocultamos.
        };
  
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
          updatedClient: responseData 
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
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
  
      // Notificar a Tiffany sobre el error
      await axios.post(tiffanyWebhook, {
        message,
        success: false
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
      return res.status(201).json({ message, success: false });
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
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
  
        // Notificar a Tiffany sobre el éxito
        await axios.post(tiffanyWebhook, {
          message: "Nuevo producto creado con éxito.",
          productData: newProduct,
          success: true
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
        return res.status(200).json({
          message: "Nuevo producto creado con éxito.",
          success: true,
          product: newProduct
        });
      } else {
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
  
        // Notificar a Tiffany sobre el error al insertar el producto
        await axios.post(tiffanyWebhook, {
          message: "Error al crear el nuevo producto.",
          success: false
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
        return res.status(202).json({
          message: "Error al crear el nuevo producto.",
          success: false
        });
      }
    } catch (error) {
      console.error('Error al crear el producto:', error);
  
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
  
      // Notificar a Tiffany sobre el error interno
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


  const getAllProductsapi = async (req, res) => {
    try {
      const productsCollection = pool.db('pocketux').collection('products');
  
      // Obtener todos los productos de la colección
      const products = await productsCollection.find().toArray();
  
      if (products.length === 0) {
        const message = "No se encontraron productos en la colección.";
  
        // Notificar a Tiffany sobre el resultado vacío
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
        await axios.post(tiffanyWebhook, {
          message,
          success: false
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
        return res.status(201).json({
          message,
          success: false,
          products: []
        });
      }
  
      // Notificar a Tiffany sobre el éxito
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(tiffanyWebhook, {
        message: "Productos recuperados con éxito.",
        success: true,
        products
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
      return res.status(200).json({
        message: "Productos recuperados con éxito.",
        success: true,
        products
      });
    } catch (error) {
      console.error('Error al recuperar los productos:', error);
  
      // Notificar a Tiffany sobre el error interno
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(tiffanyWebhook, {
        message: "Error interno al intentar recuperar los productos.",
        error: error.message,
        success: false
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
  
      return res.status(500).json({
        message: "Error interno al intentar recuperar los productos.",
        success: false
      });
    }
  };
  
  const getSpecificProductapi = async (req, res) => {
    const query = req.query; // Obtiene los parámetros desde la URL

    // Validar si no se han proporcionado parámetros
    if (Object.keys(query).length === 0) {
        const message = "Debe proporcionar al menos un campo para buscar el producto.";

        // Notificar a Tiffany sobre el error
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
        await axios.post(tiffanyWebhook, {
            message,
            success: false
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

        // Retornar 201 para notificar sobre falta de parámetros
        return res.status(201).json({
            message,
            success: false,
            product: null
        });
    }

    try {
        const productsCollection = pool.db('pocketux').collection('products');

        // Buscar producto específico basado en los campos proporcionados en la query
        const product = await productsCollection.findOne(query);

        if (!product) {
            const message = "No se encontró ningún producto que coincida con los criterios proporcionados.";

            // Notificar a Tiffany sobre el resultado vacío
            const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
            await axios.post(tiffanyWebhook, {
                message,
                success: false
            }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

            // Retornar 201 para notificar resultado vacío
            return res.status(201).json({
                message,
                success: false,
                product: null
            });
        }

        // Notificar a Tiffany sobre el éxito
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
        await axios.post(tiffanyWebhook, {
            message: "Producto recuperado con éxito.",
            success: true,
            product
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

        // Retornar 200 indicando éxito
        return res.status(200).json({
            message: "Producto recuperado con éxito.",
            success: true,
            product
        });
    } catch (error) {
        console.error('Error al recuperar el producto:', error);

        const message = "Hubo un problema al procesar su solicitud, pero se registró el incidente.";

        // Notificar a Tiffany sobre el problema interno
        const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
        await axios.post(tiffanyWebhook, {
            message,
            success: false
        }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

        // Retornar 202 indicando que hubo un problema, pero el flujo no se interrumpe
        return res.status(202).json({
            message,
            success: false,
            product: null
        });
    }
};

const updateProductapi = async (req, res) => {
  const { product_id } = req.query; // ID del producto como query parameter
  const updates = req.body; // Campos a actualizar desde el body
  const updatedBy = "admin"; // Usuario que realiza la actualización (por ahora está fijo como "admin")

  if (!product_id) {
    const message = "Debe proporcionar el 'product_id' como parámetro para actualizar el producto.";

    // Notificar a Tiffany
    const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
    await axios.post(tiffanyWebhook, { message, success: false })
      .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(201).json({
      message,
      success: false
    });
  }

  if (Object.keys(updates).length === 0) {
    const message = "Debe proporcionar al menos un campo en el body para actualizar.";

    // Notificar a Tiffany
    const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
    await axios.post(tiffanyWebhook, { message, success: false })
      .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(201).json({
      message,
      success: false
    });
  }

  try {
    const productsCollection = pool.db('pocketux').collection('products');
    const logsCollection = pool.db('pocketux').collection('logProduct'); // Colección para los logs de actualización

    // Buscar el producto actual
    const product = await productsCollection.findOne({ product_id });

    if (!product) {
      const message = "No se encontró ningún producto con el 'product_id' proporcionado.";

      // Notificar a Tiffany
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(tiffanyWebhook, { message, success: false })
        .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(201).json({
        message,
        success: false
      });
    }

    // Comprobar si los valores enviados son iguales a los actuales
    let isUpdated = false;
    for (let key in updates) {
      if (updates[key] !== product[key]) {
        isUpdated = true;
        break;
      }
    }

    if (!isUpdated) {
      const message = "Los campos enviados son iguales a los actuales. No se realizaron cambios.";

      // Notificar a Tiffany
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(tiffanyWebhook, { message, success: true, product })
        .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(200).json({
        message,
        success: true,
        product
      });
    }

    // Intentar actualizar el producto
    const result = await productsCollection.updateOne(
      { product_id },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      const message = "No se encontró ningún producto con el 'product_id' proporcionado.";

      // Notificar a Tiffany
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(tiffanyWebhook, { message, success: false })
        .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(201).json({
        message,
        success: false
      });
    }

    // Registrar cambios en el log
    const logEntry = {
      product_id,
      updates,
      updatedBy, // Aquí está "admin"
      updatedAt: new Date().toISOString(),
    };
    await logsCollection.insertOne(logEntry);

    // Notificar a Tiffany sobre el éxito
    const message = "Producto actualizado con éxito.";
    const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
    await axios.post(tiffanyWebhook, { message, success: true, product_id, updates })
      .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(200).json({
      message,
      success: true,
      log: logEntry,
      product: { ...product, ...updates }
    });
  } catch (error) {
    console.error('Error al actualizar el producto:', error);

    // Notificar a Tiffany sobre el error interno
    const message = "Error interno al intentar actualizar el producto.";
    const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
    await axios.post(tiffanyWebhook, { message, error: error.message, success: false })
      .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(202).json({
      message,
      success: false
    });
  }
};

const deleteProductApi = async (req, res) => {
  const { product_id } = req.query; // El ID del producto como query parameter

  if (!product_id) {
    const message = "Debe proporcionar el 'product_id' como parámetro para eliminar el producto.";

    // Notificar a Tiffany
    const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
    await axios.post(tiffanyWebhook, { message, success: false })
      .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(201).json({
      message,
      success: false
    });
  }

  try {
    const productsCollection = pool.db('pocketux').collection('products');
    const productHistoryCollection = pool.db('pocketux').collection('productshistory'); // Nueva colección de historial de productos

    // Buscar el producto
    const product = await productsCollection.findOne({ product_id });

    if (!product) {
      const message = "No se encontró ningún producto con el 'product_id' proporcionado.";

      // Notificar a Tiffany
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(tiffanyWebhook, { message, success: false })
        .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(201).json({
        message,
        success: false
      });
    }

    // Crear el objeto para el historial con solo los campos relevantes
    const productHistory = {
      product_id: product.product_id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      availability: product.availability,
      tags: product.tags,
      deletedAt: new Date().toISOString(), // Fecha y hora de eliminación
      deletedBy: "admin", // Usuario que realiza la eliminación
    };

    // Mover el producto a la colección de historial antes de eliminarlo
    const result = await productHistoryCollection.insertOne(productHistory);
    if (result.insertedCount === 0) {
      const message = "Error al intentar guardar el producto en el historial.";

      // Notificar a Tiffany
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(tiffanyWebhook, { message, success: false })
        .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(500).json({
        message,
        success: false
      });
    }

    // Eliminar el producto de la colección 'products'
    const deleteResult = await productsCollection.deleteOne({ product_id });

    if (deleteResult.deletedCount === 0) {
      const message = "No se encontró ningún producto con el 'product_id' proporcionado para eliminar.";

      // Notificar a Tiffany
      const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
      await axios.post(tiffanyWebhook, { message, success: false })
        .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(201).json({
        message,
        success: false
      });
    }

    // Notificar a Tiffany sobre el éxito de la eliminación
    const message = "Producto eliminado y movido al historial con éxito.";
    const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
    await axios.post(tiffanyWebhook, { message, success: true, product_id })
      .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(200).json({
      message,
      success: true,
      product: productHistory // Retorna toda la información relevante del producto eliminado
    });
  } catch (error) {
    console.error('Error al eliminar el producto:', error);

    // Notificar a Tiffany sobre el error interno
    const message = "Error interno al intentar eliminar el producto.";
    const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';
    await axios.post(tiffanyWebhook, { message, error: error.message, success: false })
      .catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(202).json({
      message,
      success: false
    });
  }
};

  
  
 /*---------------------------------Relacion productos and clientes(cotizacion)--------------------------------------------------------------*/
  
 const createQuotationapi = async (req, res) => {
  const { clientId, productId, duration } = req.body; // `duration` se especifica como días (7, 15, 30, etc.)
  const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';

  try {
    // Conexión a las colecciones
    const clientsCollection = pool.db('pocketux').collection('clients');
    const productsCollection = pool.db('pocketux').collection('products');
    const quotationsCollection = pool.db('pocketux').collection('quotations');

    // Obtener el cliente por su ID
    const client = await clientsCollection.findOne({ id: clientId });
    if (!client) {
      await axios.post(tiffanyWebhook, {
        message: "Cliente no encontrado para la cotización.",
        clientId,
        success: false
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(201).json({ message: "No se encontraron clientes.", success: false });
    }

    // Obtener el producto por su ID
    const product = await productsCollection.findOne({ product_id: productId });
    if (!product) {
      await axios.post(tiffanyWebhook, {
        message: "Producto no encontrado para la cotización.",
        productId,
        success: false
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(201).json({ message: "Producto no encontrado.", success: false });
    }

    // Verificar si ya existe una cotización para este cliente y producto
    const existingQuotation = await quotationsCollection.findOne({
      clientId: client.id,
      productId: product.product_id
    });

    if (existingQuotation) {
      await axios.post(tiffanyWebhook, {
        message: "Cotización ya existente.",
        clientId,
        productId,
        success: true
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(202).json({
        message: "Cotización ya realizada previamente.",
        success: true,
        quotation: existingQuotation // Muestra la cotización existente
      });
    }

    // Calcular la fecha de expiración de la cotización
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + duration); // Sumar la duración (en días) al tiempo actual

    // Crear el objeto de cotización
    const quotation = {
      clientId: client.id, // Cedula del cliente
      clientFullName: client.fullName, // Nombre completo del cliente
      clientEmail: client.email, // Correo del cliente
      clientPhone: client.phone, // Teléfono del cliente
      productId: product.product_id, // ID del producto
      productName: product.name, // Nombre del producto
      productDescription: product.description, // Descripción del producto
      productPrice: product.price.amount, // Precio del producto
      status: "quoting", // Estado de la cotización
      createdAt: new Date().toISOString(), // Fecha de creación
      updatedAt: new Date().toISOString(), // Fecha de actualización
      expirationDate: expirationDate.toISOString() // Fecha de expiración
    };

    // Insertar la cotización en la colección 'quotations'
    const result = await quotationsCollection.insertOne(quotation);
    if (!result.acknowledged) {
      await axios.post(tiffanyWebhook, {
        message: "Error al crear la cotización.",
        clientId,
        productId,
        success: false
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(202).json({ message: "Error al crear la cotización.", success: false });
    }

    // Actualizar el estado del producto a "quoting"
    await productsCollection.updateOne(
      { product_id: productId },
      { $set: { status: "quoting", clientId: client.id } }
    );

    // Configurar un temporizador para manejar la expiración
    setTimeout(async () => {
      try {
        // Verificar si la cotización aún existe (podría haberse eliminado o completado antes)
        const existingQuotation = await quotationsCollection.findOne({ _id: result.insertedId });

        if (existingQuotation) {
          // Eliminar la cotización
          await quotationsCollection.deleteOne({ _id: result.insertedId });

          // Restaurar el estado del producto a "activo"
          await productsCollection.updateOne(
            { product_id: productId },
            { $set: { status: "activo" }, $unset: { clientId: "" } }
          );

          console.log(`Cotización con ID ${result.insertedId} eliminada por expiración.`);
          await axios.post(tiffanyWebhook, {
            message: `La cotización con ID ${result.insertedId} ha expirado y el producto ha sido restaurado a "activo".`,
            success: true
          }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));
        }
      } catch (error) {
        console.error('Error al manejar la expiración de la cotización:', error.message);
      }
    }, duration * 24 * 60 * 60 * 1000); // Convertir días a milisegundos

    // Responder al cliente con éxito
    await axios.post(tiffanyWebhook, {
      message: "Cotización creada y estado del producto actualizado.",
      clientId,
      productId,
      success: true
    }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(200).json({
      message: "Cotización creada y estado del producto actualizado con éxito.",
      success: true,
      quotation
    });
  } catch (error) {
    console.error('Error al crear cotización:', error);

    await axios.post(tiffanyWebhook, {
      message: "Error interno al procesar la cotización.",
      error: error.message,
      success: false
    }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(500).json({
      message: "Error interno al procesar la cotización.",
      success: false
    });
  }
};

const confirmPurchaseapi = async (req, res) => {
  const { clientId, productId } = req.body; // Datos enviados en el body
  const tiffanyWebhook = 'https://hook.us1.make.com/4auymefrnm62pi5vjfs9eziaskhoc9uc';

  try {
    // Conexión a las colecciones
    const quotationsCollection = pool.db('pocketux').collection('quotations');
    const productsCollection = pool.db('pocketux').collection('products');
    const purchasesCollection = pool.db('pocketux').collection('purchases');

    // Buscar la cotización correspondiente
    const quotation = await quotationsCollection.findOne({ clientId, productId });

    if (!quotation) {
      // Notificar si la cotización no existe
      const message = "No se encontró una cotización para el cliente y producto proporcionados.";
      await axios.post(tiffanyWebhook, {
        message,
        clientId,
        productId,
        success: false
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(201).json({
        message,
        success: false
      });
    }

    // Eliminar la cotización
    const deleteQuotation = await quotationsCollection.deleteOne({ clientId, productId });

    if (deleteQuotation.deletedCount === 0) {
      const message = "Error al intentar eliminar la cotización.";
      await axios.post(tiffanyWebhook, {
        message,
        clientId,
        productId,
        success: false
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(202).json({
        message,
        success: false
      });
    }

    // Crear un registro en la colección `purchases`
    const purchase = {
      clientId: quotation.clientId,
      clientFullName: quotation.clientFullName,
      clientEmail: quotation.clientEmail,
      clientPhone: quotation.clientPhone,
      productId: quotation.productId,
      productName: quotation.productName,
      productDescription: quotation.productDescription,
      productPrice: quotation.productPrice,
      status: "completed", // Estado de la compra
      purchaseDate: new Date().toISOString(), // Fecha de la compra
      updatedAt: new Date().toISOString() // Fecha de actualización
    };

    const createPurchase = await purchasesCollection.insertOne(purchase);

    if (!createPurchase.acknowledged) {
      const message = "Error al registrar la compra.";
      await axios.post(tiffanyWebhook, {
        message,
        clientId,
        productId,
        success: false
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(202).json({
        message,
        success: false
      });
    }

    // Actualizar el estado del producto a "used" y asociarlo con el cliente
    const updateProduct = await productsCollection.updateOne(
      { product_id: productId },
      { $set: { status: "used", usedBy: clientId, updatedAt: new Date().toISOString() } }
    );

    if (updateProduct.modifiedCount === 0) {
      const message = "Error al actualizar el estado del producto tras la compra.";
      await axios.post(tiffanyWebhook, {
        message,
        clientId,
        productId,
        success: false
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(202).json({
        message,
        success: false
      });
    }

    // Notificar éxito de la compra
    const message = "Compra confirmada con éxito. Cotización eliminada, compra registrada y producto actualizado.";
    await axios.post(tiffanyWebhook, {
      message,
      clientId,
      productId,
      success: true
    }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(200).json({
      message,
      success: true,
      purchase
    });
  } catch (error) {
    console.error('Error al confirmar la compra:', error);

    const message = "Error interno al procesar la compra.";
    await axios.post(tiffanyWebhook, {
      message,
      error: error.message,
      success: false
    }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(500).json({
      message,
      success: false
    });
  }
};


/*---------------------------------DASHBOARD --------------------------------------------------------------*/

const loginClientapi = async (req, res) => {
  const { email, password } = req.body; // Datos enviados desde el cliente

  try {
    // Conexión a la base de datos y acceso a la colección 'clients'
    const collection = pool.db('pocketux').collection('clients');
    
    // Buscar al usuario por el campo 'email' (case-insensitive)
    const user = await collection.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (!user) {
      return res.status(404).json({ 
        status: "Error", 
        message: "Usuario no encontrado. Verifica tus credenciales." 
      });
    }

    // Comparar la contraseña cifrada
    const hashedPassword = CryptoJS.SHA256(password, process.env.CODE_SECRET_DATA).toString();
    if (hashedPassword !== user.password) {
      return res.status(401).json({ 
        status: "Error", 
        message: "Contraseña incorrecta. Verifica tus credenciales." 
      });
    }

    // Formatear los datos para que coincidan con el frontend
    const formattedData = {
      email: user.email || "No especificado",
      fullName: user.fullName || "No especificado",
      company: user.company?.name || "No especificado",
      department: user.company?.department || "No especificado",
      position: user.company?.position || "No especificado",
      roles: user.roles?.join(", ") || "No especificado",
    };

    // Responder con los datos al frontend
    return res.status(200).json({
      status: "Success",
      message: `Inicio de sesión exitoso. Bienvenido, ${formattedData.fullName}.`,
      clientData: formattedData,
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);
    return res.status(500).json({ 
      status: "Error", 
      message: "Error interno del servidor", 
      error: error.message 
    });
  }
};

  


const verifyPhoneNumberapi = async (req, res) => {
  const { phoneNumber } = req.body; // Número de teléfono enviado en el body de la solicitud
  const tiffanyWebhook = 'https://hook.us1.make.com/r00ckvp8vqste3n1oyy1s6srb8ho8x3o';

  try {
    // Conexión a la base de datos y acceso a la colección 'clients'
    const db = client.db('pocketux');
    const collection = db.collection('clients');

    // Buscar el cliente por el número de teléfono
    const clientFound = await collection.findOne({ phone: phoneNumber });

    if (!clientFound) {
      // Si no se encuentra el número, notificar a Tiffany que no está registrado
      const message = "El número de teléfono no está registrado en nuestra base de datos.";
      await axios.post(tiffanyWebhook, {
        message,
        phoneNumber,
        success: false
      }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

      return res.status(201).json({
        status: "Error",
        message: "El número no está registrado en la base de datos."
      });
    }

    // Si el número está registrado, enviar la información al webhook de Tiffany
    const message = "Número de teléfono verificado con éxito.";
    const response = await axios.post(tiffanyWebhook, {
      message,
      phoneNumber: clientFound.phone,
      clientId: clientFound._id,
      success: true
    }).catch((webhookError) => {
      console.error('Error al enviar el webhook:', webhookError.message);
      throw new Error('Error al comunicar con Tiffany');
    });

    // Verificar la respuesta del webhook (esperamos un código de respuesta 200)
    if (response.status === 200) {
      // Actualizar el campo 'password' en la colección 'clients'
      const newPassword = response.data.newPassword; // Supongamos que la respuesta de Tiffany contiene el nuevo password
      const updatePassword = await collection.updateOne(
        { phone: phoneNumber },
        { $set: { password: newPassword } }
      );

      if (updatePassword.modifiedCount === 0) {
        return res.status(202).json({
          status: "Error",
          message: "Error al actualizar la contraseña del cliente."
        });
      }

      // Responder al cliente confirmando que la contraseña fue actualizada
      return res.status(200).json({
        status: "Success",
        message: "Número de teléfono verificado y contraseña actualizada con éxito."
      });
    } else {
      return res.status(202).json({
        status: "Error",
        message: "Error al recibir la respuesta adecuada de Tiffany."
      });
    }

  } catch (error) {
    console.error('Error al verificar el número de teléfono:', error.message);

    // Notificar al webhook que ocurrió un error en el proceso
    const message = "Error interno al procesar la verificación del número de teléfono.";
    await axios.post(tiffanyWebhook, {
      message,
      error: error.message,
      success: false
    }).catch((webhookError) => console.error('Error al enviar el webhook:', webhookError.message));

    return res.status(500).json({
      status: "Error",
      message: "Error interno al procesar la solicitud.",
      error: error.message
    });
  }
};
/*---------------------------------home --------------------------------------------------------------*/
const newUserHomeApi = async (req, res) => {
  const datos = req.body;

  // Validar número de teléfono real
  const isValidPhone = (phone) => {
    const phoneNumber = parsePhoneNumberFromString(phone, "MX"); // México por defecto
    return phoneNumber && phoneNumber.isValid();
  };

  try {
    await pool.connect();
    const collection = pool.db("pocketux").collection("usershome");

    if (!isValidPhone(datos.phone)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    // Generar estructura de datos para ambos casos (wp o voice)
    const newUserData = {
      phone: datos.phone,
      platform: datos.platform, // "wp" o "voice"
      name: datos.name || null,
      jobTitle: datos.jobTitle || null,
      company: datos.company || null,
      inquiry: datos.inquiry || null, // Pregunta del usuario
      agent_type: datos.agent_type || null, // "medical", "paralegal" o "betterself"
      createdAt: new Date(),
    };

    // Guardar en MongoDB
    await collection.insertOne(newUserData);

    // Enviar datos al webhook de Tiffany
    const tiffanyWebhook = "https://hook.us1.make.com/mpn2qokb8bjqvg1fu2l7otufv4it4x3w";
    const response = await axios.post(tiffanyWebhook, newUserData);

    if (response.status === 200) {
      console.log(`✅ Tiffany successfully connected via ${datos.platform}`);
    }

    return res.status(200).json({
      message: "User successfully registered",
      user: newUserData,
    });
  } catch (error) {
    console.error("Error registering user:", error.message);
    return res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    await pool.close();
  }
};

const tryapimedicalapi = async (req, res) => {
  const data = req.body;

  try {
    await pool.connect();
    const collection = pool.db("pocketux").collection("testapimedical");

    // Guardar datos en MongoDB
    const storedData = {
      ...data,
      receivedAt: new Date(),
    };
    await collection.insertOne(storedData);

    // Enviar datos al webhook de Tiffany
    const tiffanyWebhook = "https://hook.us1.make.com/mpn2qokb8bjqvg1fu2l7otufv4it4x3w";
    const response = await axios.post(tiffanyWebhook, data);

    if (response.status === 200) {
      console.log(`✅ Tiffany successfully received medical test data`);
    }

    return res.status(200).json({
      message: "Medical API test data successfully stored and sent to Tiffany",
      tiffany_response: response.data,
    });

  } catch (error) {
    console.error("Error processing medical API test:", error.message);
    return res.status(500).json({ message: "Server error", error: error.message });

  } finally {
    await pool.close();
  }
};
const tryapiparalegalapi = async (req, res) => {
  const data = req.body;

  try {
    await pool.connect();
    const collection = pool.db("pocketux").collection("testapiparalegal");

    // Guardar datos en MongoDB
    const storedData = {
      ...data,
      receivedAt: new Date(),
    };
    await collection.insertOne(storedData);

    // Enviar datos al webhook de Tiffany
    const tiffanyWebhook = "https://hook.us1.make.com/mpn2qokb8bjqvg1fu2l7otufv4it4x3w";
    const response = await axios.post(tiffanyWebhook, data);

    if (response.status === 200) {
      console.log(`✅ Tiffany successfully received paralegal test data`);
    }

    return res.status(200).json({
      message: "Paralegal API test data successfully stored and sent to Tiffany",
      tiffany_response: response.data,
    });

  } catch (error) {
    console.error("Error processing paralegal API test:", error.message);
    return res.status(500).json({ message: "Server error", error: error.message });

  } finally {
    await pool.close();
  }
};
const tryapibetterselfapi = async (req, res) => {
  const data = req.body;

  try {
    await pool.connect();
    const collection = pool.db("pocketux").collection("testapibetterself");

    // Guardar datos en MongoDB
    const storedData = {
      ...data,
      receivedAt: new Date(),
    };
    await collection.insertOne(storedData);

    // Enviar datos al webhook de Tiffany
    const tiffanyWebhook = "https://hook.us1.make.com/mpn2qokb8bjqvg1fu2l7otufv4it4x3w";
    const response = await axios.post(tiffanyWebhook, data);

    if (response.status === 200) {
      console.log(`✅ Tiffany successfully received betterself test data`);
    }

    return res.status(200).json({
      message: "BetterSelf API test data successfully stored and sent to Tiffany",
      tiffany_response: response.data,
    });

  } catch (error) {
    console.error("Error processing betterself API test:", error.message);
    return res.status(500).json({ message: "Server error", error: error.message });

  } finally {
    await pool.close();
  }
};

const registerbywebapi = async (req, res) => { 
  const datos = req.body;
  
  const generateApiKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      let apiKey = '';
      for (let i = 0; i < 10; i++) {
          apiKey += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return apiKey;
  };
  
  const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
  };
  
  try {
      const collection = pool.db('pocketux').collection('registerweb');
      const clientsCollection = pool.db('pocketux').collection('clients');
      
      const existingClient = await clientsCollection.findOne({ email: datos.email });
      const existingTrialUser = await collection.findOne({ email: datos.email });
      
      if (existingClient || existingTrialUser) {
          return res.status(409).json({ message: "El correo ya está en uso." });
      }

      const apiKey = generateApiKey();
      const password = generatePassword();
      const hashedPassword = CryptoJS.SHA256(password, process.env.CODE_SECRET_DATA).toString();
      
      const newUser = {
          fullName: datos.fullName || null,
          email: datos.email,
          phone: datos.phone || null,
          password: hashedPassword,
          apiKey,
          createdBy: "web",
          createdAt: new Date()
      };
      
      await collection.insertOne(newUser);
      
      return res.status(201).json({
          message: "Usuario registrado en prueba.",
          credentials: {
              email: datos.email,
              password
          }
      });
  } catch (error) {
      console.error('Error en registerbyweb:', error.message);
      return res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
  }
};

// Cron job para mover usuarios después de 3 días
taskScheduler.scheduleJob('0 0 * * *', async () => {
  const registerCollection = pool.db('pocketux').collection('registerweb');
  const logsCollection = pool.db('pocketux').collection('logsweb');
  const clientsCollection = pool.db('pocketux').collection('clients');

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const expiredUsers = await registerCollection.find({ createdAt: { $lte: threeDaysAgo } }).toArray();

  for (const user of expiredUsers) {
      await logsCollection.insertOne(user);
      await registerCollection.deleteOne({ email: user.email });

      const webhookUrl = 'https://hook.us1.make.com/your-webhook-url';
      try {
          const response = await axios.post(webhookUrl, { email: user.email, status: "trial_ended" });
          if (response.data.continuePlan) {
              await clientsCollection.insertOne(user);
          }
      } catch (webhookError) {
          console.error('Error enviando webhook:', webhookError.message);
      }
  }
});

  
  module.exports = {
    newClientapi,
    getAllClientsapi,
    getClientByCriteriaapi,
    updateClientapi,
    deleteClientapi,
    newProductapi,
    createQuotationapi,
    loginClientapi,
    getAllProductsapi,
    getSpecificProductapi, 
    updateProductapi,
    deleteProductApi,
    confirmPurchaseapi,
    verifyPhoneNumberapi,
    newUserHomeApi,
    tryapimedicalapi,
    tryapiparalegalapi,
    tryapibetterselfapi,
    registerbywebapi
  };