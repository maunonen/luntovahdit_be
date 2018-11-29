const express = require("express"); 
let actrouter = express.Router(); 


actrouter.post("/", function(req, res){
    res.status(200).json({"message" : "from welcome menu"})
})

actrouter.post("/searchbar", function(req, res){
    res.status(200).json({"message": "searchbar route"}); 
})

actrouter.post("/hotspots", function(req, res){
    res.status(200).json({"message" : "hotspots"})
})

actrouter.post("/testcategory", function (req, res){
    res.status(200).json({"message" : "category 1"})
})
    
module.exports = actrouter; 