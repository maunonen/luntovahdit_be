const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const userModel = require("./models/users");
const bcrypt = require("bcrypt")
const profileRoute = require("./routes/profileRouter");

const {body,check,validationResult  }   = require('express-validator/check');
const {sanitizeBody}  = require('express-validator/filter');

const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
require('dotenv').config();


let app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 8000;

mongoose.connect( process.env.ATLAS_URI,

    { useNewUrlParser: true }
    
).then(
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
        //url : "mongodb://localhost/luontovahditsession",
        url : process.env.ATLAS_URI,
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


app.get("/", function(req, res, next){
    return res.status(200).json({"home" : "redirect to home page"});
})

app.post("/login", [

        sanitizeBody('username').trim().escape(),
        sanitizeBody('password').trim().escape(),
        body('username').isLength({min : 3, max : 20}).withMessage('Username must be at least 6 digit. Symbols: <,>,&,\',\",/ not allowed'),
        body('password').isLength({min : 3, max : 20}).withMessage('Password must be at least 6 digit. Symbols: <,>,&,\',\",/ not allowed')

    ], function(req, res, next){

        const lgnerrors = validationResult(req);
        if (!lgnerrors.isEmpty()) {
            return res.status(409).json(lgnerrors.array());
        } else {
            next();
        }
    },

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

    userModel.findOne({"username" : username}, function(err, user){
        if (err){
            return done(err);
        }
        if (!user){
            return done(null, false, "Wrong credential");
        }
        if (isPasswordValid(password, user.password)){

            let token = createToken();
            req.session.token = token;
            req.session.username = username;
            return done(null, user);
        }
    })
}))




app.post("/register", [


    body('username').isLength({min : 6, max : 20}).withMessage('Username must be at least 6 digit'),
    body('password').isLength({min : 6, max : 20}).withMessage('Password must be at least 6 digit'),
    body('displayname').isLength({min : 6, max : 20}).withMessage('Displayname must be at least 6 digit'),
    body('email').isEmail().withMessage('Check email address'),
    sanitizeBody('username').trim().escape(),
    sanitizeBody('password').trim().escape(),
    sanitizeBody('displayname').trim().escape(),
    sanitizeBody('email').normalizeEmail()


], function(req, res){

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(409).json(errors.array());
    }

    let user = new userModel({
        "username" : req.body.username,
        "displayname" : req.body.displayname,
        "password" : createSaltedPassword(req.body.password),
        "email" : req.body.email
    })

    user.save().then(
        () => {return res.status(200).json({"message": "success"})},
        (error) => { return res.status(409).json({ "message" : "username or email address already in use " });}
    )
});


function isUserLogged(req, res, next){

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

app.use("/profile", isUserLogged, profileRoute);
app.listen(port);
console.log("Running in port" + port);






