const express = require('express');
const router = express.Router();
const { newClientapi } =require('./controllers/tifannyControllers');


router.post('/newClient', newClientapi);




module.exports = router;