const express = require('express');
const router = express.Router();
const { newClientapi,getAllClientsapi,getClientByCriteriaapi,updateClientapi, deleteClientapi,newProductapi } =require('./controllers/tifannyControllers');


router.post('/newClient', newClientapi);
router.get('/getAllClients', getAllClientsapi);
router.get('/getClientByCriteria', getClientByCriteriaapi);
router.put('/updateClient/:id', updateClientapi);
router.delete('/deleteClient/:id', deleteClientapi);
router.post('/newProduct', newProductapi);

module.exports = router;