const express = require("express"); 
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const userModel = require("./models/users");
const bcrypt = require("bcrypt")
const actrouter = require("./routes/actrouter"); 

const { body } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

//const validator = require("express-validator"); 
// ********** 

const passport = require("passport"); 
const localStrategy = require("passport-local").Strategy; 
const session = require("express-session"); 
const MongoStore = require("connect-mongo")(session);  
var expressValidator = require('express-validator');


const {check, validationResult} = require ("express-validator/check"); 



let app = express(); 
app.use(bodyParser.json());
app.use(expressValidator());  

mongoose.connect("mongodb://localhost/login").then(
    () => {console.log("Connection to mongo DB successfull")},
    (error) => {console.log("Connection to mongpDB failed: " + error)}
);

app.use(session({
    name : "luontovahdit-id", 
    resave : false, 
    secret : "LuontoVahditSecret", 
    saveUninitialized : false, 
    cookie : {maxAge : 180 * 60 * 60 * 24}, 
    store : new MongoStore ({
        collection : "session",
        url : "mongodb://localhost/luontovahditsession",
        ttl : 24 * 60 * 60
    })
}));


app.use(passport.initialize()); 
app.use(passport.session()); 

passport.serializeUser(function(user, done){
    console.log("SerializeUser: "  + user.username);
    done(null, user._id); 
})

passport.deserializeUser(function(id, done) {
    console.log("deserializeUser"); 
    userModel.findById(id, function(err, user){
        if(err){
            return done(err); 
        }
        if(!user){
            return done(null, false); 
        }
        return done(null, user); 

    })
})



let loggedUsers = []; 

function createSaltedPassword (pw){
    return bcrypt.hashSync(pw, bcrypt.genSaltSync(8), null);
}

function isPasswordValid (pw, hash){
    return bcrypt.compareSync(pw, hash); 
}

/**
 * How users we login to programm by username or email?
 * 
 *
 * 
 */

app.post("/login", 

passport.authenticate("local-login", {failureRedirect : "/" }), function(req, res){
    return res.status(200).json({"token" : req.session.token})
}); 

app.post("/logout", function (req, res){
    if (req.session){
        req.session.destroy(); 
    }
    return res.status(200).json({"message" : "logged out" })
})


passport.use("local-login", new localStrategy({
    usernameField : "username",
    passwordField : "password", 
    passReqToCallback : true
}, function(req, username, password, done) {


    // use validator 
    if(!req.body.username || !req.body.password) {
        return done(null, false, "Wrong credential"); 
    } 
    // use validator
    if (req.body.username.lenght === 0 || req.body.password.lenght === 0 ){
        return done(null, false, "Wrong credentials"); 
    }
userModel.findOne({"username" : username}, function(err, user){
        if (err){
            return done(err); 
        }
        if (!user){
            return done(null, false, "Wrong credential"); 
        }
        if (isPasswordValid(password, user.password)){

            /**
             * Try ceate react-token 
             */
            let token = createToken(); 
            req.session.token = token; 
            req.session.username = username; 
            return done(null, user); 
        }
})
}))


/**
 *  Validaator email 
 * req.check('email', 'invalid email address').isEmail(); 
 * validate password 
 * req.check('Password is not valid').isLenght({min : 8}).equals(req.body.confirmPassword); 
 * var errors = req.validationErrors(); 
 * if (error){
 *  req.session.errors  = errors;
 * }
 * 
 * res.redirect("/register""); 
 */

app.post("/register", function(req, res){
    
    /**  Use validator  */
    req.check('username', 'Name is required').notEmpty(); 
    req.check('password', 'Password is required').notEmpty(); 
    req.check('displayname', 'Displayname is required').notEmpty(); 
    req.check('email', 'Email is required').notEmpty().isEmail(); 
    let valError = req.validationErrors(); 


    console.log(valError); 
    if(valError){
        return res.status(409).json({valError}); 
    }

    /*
    let errmessage = ""; 
    if (!req.body.username || !req.body.password ){
        return res.status(409).json({"message" :  "provide credentials" })
    } 
     if(!req.body.disname || !req.body.email){
        return res.status(409).json({"message" :  "provide credentials" })
    } 
    if(req.body.username.lenght === 0 || req.body.password.lenght === 0){
        return res.status(409).json({"message" :  "provide credentials" }) 
    } 
    if (req.body.disname.lenght === 0|| req.body.email.lenght === 0){
        return res.status(409).json({"message" :  "provide credentials" })
    }
    */ 
/** Should we save email with salt?*/

    body('email').not().isEmail().normalizeEmail(); 
    body('username').not().isEmpty().trim().escape(); 
    body('password').not().isEmpty().trim().escape(); 
    body('displayname').not().isEmpty().trim().escape(); 

    console.log(req.body); 

    let user = new userModel({
        "username" : req.body.username, 
        "displayname" : req.body.displayname, 
        "password" : createSaltedPassword(req.body.password), 
        "email" : req.body.email
    })

    user.save(function(err){
            if(err){
                return res.status(409).json({ "message" : "username or email address already in use " });
            }
    })
    return res.status(200).json({"message": "success"})

});


function isUserLogged(req, res, next){

    //console.log(req.headers);

    let token = req.headers.token; 
     if(req.isAuthenticated()){
         return next(); 
     }
    return res.status(403).json({"message" : "not alllowed"}); 
}


function createToken (){

    let token = ""; 
    let letters = "abcdefghijABCDEFGHIJ0123456789"; 
    for (let i = 0; i < 1024; i++){
        let temp = Math.floor(Math.random() * 30); 
        token = token + letters[temp]; 
    }
    return token; 
}

app.use("/luontovahdit", isUserLogged, actrouter); 
app.listen(3002); 
console.log("Running in port 3002"); 






