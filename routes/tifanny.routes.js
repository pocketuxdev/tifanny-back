const express = require('express');
const router = express.Router();
const { newClientapi,getAllClientsapi,getClientByCriteriaapi } =require('./controllers/tifannyControllers');


router.post('/newClient', newClientapi);
router.get('/getAllClients', getAllClientsapi);
router.get('/getClientByCriteria', getClientByCriteriaapi);




module.exports = router;