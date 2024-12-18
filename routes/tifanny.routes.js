const express = require('express');
const router = express.Router();
const { newClientapi,getAllClientsapi,getClientByCriteriaapi,updateClientapi, deleteClientapi,newProductapi, createQuotationapi,loginClientapi, getAllProductsapi, getSpecificProductapi, updateProductapi, deleteProductApi, confirmPurchaseapi, verifyPhoneNumberapi } =require('./controllers/tifannyControllers');


router.post('/newClient', newClientapi);
router.get('/getAllClients', getAllClientsapi);
router.get('/getClientByCriteria', getClientByCriteriaapi);
router.put('/updateClient/:id', updateClientapi);
router.delete('/deleteClient/:id', deleteClientapi);
router.post('/newProduct', newProductapi);
router.post('/createQuotation', createQuotationapi);
router.post('/confirmPurchase', confirmPurchaseapi);
router.post('/loginClient', loginClientapi );
router.get('/getAllProducts', getAllProductsapi);
router.get('/getSpecificProduct', getSpecificProductapi);
router.put('/updateProduct', updateProductapi); 
router.delete('/deleteProduct', deleteProductApi);
router.post('/verifyPhoneNumber', verifyPhoneNumberapi );

module.exports = router;