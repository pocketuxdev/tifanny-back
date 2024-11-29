const express = require('express');
const router = express.Router();
const { newClientapi,getAllClientsapi,getClientByCriteriaapi,updateClientapi } =require('./controllers/tifannyControllers');


router.post('/newClient', newClientapi);
router.get('/getAllClients', getAllClientsapi);
router.get('/getClientByCriteria', getClientByCriteriaapi);
router.put('/updateClient/:id', updateClientapi);



module.exports = router;