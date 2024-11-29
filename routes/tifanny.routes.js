const express = require('express');
const router = express.Router();
const { newClientapi,getAllClientsapi } =require('./controllers/tifannyControllers');


router.post('/newClient', newClientapi);
router.get('/getAllClients', getAllClientsapi);




module.exports = router;