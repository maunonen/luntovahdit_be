const mongoose = require('mongoose'); 
let Schema = mongoose.Schema({
    username: {type: String, unique : true }, 
    displayname : {type: String}, 
    password: String,
    email : {type : String, unique : true }
})

module.exports = mongoose.model("User", Schema); 