const express = require("express"); 
const profileRoute = express.Router();
const { sanitizeBody } = require('express-validator/filter');
const { body } = require('express-validator/check');
const profileController = require ("../controllers/profileController");

profileRoute.post("/update",
    [
        //body('username').isLength({min : 6, max : 20}).withMessage('Username must be at least 6 digit'),
        body('displayname').isLength({min : 6, max : 20}).withMessage('Displayname must be at least 6 digit'),
        body('email').isEmail().withMessage('Check email address'),
        //sanitizeBody('username').trim().escape(),
        sanitizeBody('displayname').trim().escape(),
        sanitizeBody('email').normalizeEmail()

    ], profileController.profileUpdate);

profileRoute.delete("/delete", profileController.profileDelete);

profileRoute.get("/get", profileController.profileGet);

    
module.exports = profileRoute;