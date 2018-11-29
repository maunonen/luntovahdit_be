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
const expressValidator = require('express-validator');




let app = express(); 
app.use(bodyParser.json());
//app.use(body); 
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

 app.post("/", function(req, res, next){
     return res.status(200).json({"home" : "redirect to home page"});
 })

 app.get("/", function(req, res, next){
    return res.status(200).json({"home" : "redirect to home page"});
})

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

    console.log("HEllo from checkBODY");

    req.checkBody('username', 'Username is required').notEmpty().isLength({min: 3, max : 20}); 
    req.checkBody('password', 'Wrong credential').notEmpty(); 

    let lclError = req.validationErrors(); 

    console.log(lclError); 

    console.log("HEllo from lclERROR");
    //console.log(lclError); 

    if (lclError){
        console.log("HEllo from IF lclERROR");
        return done(null, false, "Wronr credential"); 
    }

    //req.sanitizeBody(); 
    console.log("HEllo from sanitize "); 

    req.sanitizeBody('username').trim(); 
    req.sanitizeBody('password').trim();

    console.log("HEllo from MONGO"); 
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


app.post("/register", function(req, res){
    
    req.checkBody('username', 'Name is required').not().isEmpty().isLength({min : 6}); 
    req.checkBody('password', 'Password is required').not().isEmpty();   
    req.checkBody('password', 'passsword and confirmpassword does`t match').equals(req.body.confirmpassword);       
    req.checkBody('displayname', 'Displayname is required').notEmpty(); 
    req.checkBody('email', 'Email is required').notEmpty().isEmail();  

    /**  Use validator  */
   
    let valError = req.validationErrors(); 

    //console.log(valError.isEmpty); 
    if(!valError.isEmpty){
        return res.status(409).json({valError}); 
    }

/** Should we save email with salt?*/

    req.sanitizeBody('email').normalizeEmail(); 
    req.sanitizeBody('username').trim(); 
    req.sanitizeBody('password').trim(); 
    req.sanitizeBody('displayname').trim(); 

    console.log(req.body); 
    
    let user = new userModel({
        "username" : req.body.username, 
        "displayname" : req.body.displayname, 
        "password" : createSaltedPassword(req.body.password), 
        "email" : req.body.email
    })

    console.log(user); 
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






