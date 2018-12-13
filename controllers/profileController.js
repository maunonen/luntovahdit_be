
const { validationResult } = require('express-validator/check');
const userModel = require("../models/users");



exports.profileUpdate  = function (req, res) {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(409).json(errors.array());
    }

    userModel.findOneAndUpdate(
        {username: req.session.username},
        {$set: {displayname: req.body.displayname, email: req.body.email }},
        {new: true},
        (err, data) => {
            if (err) {
                return res.status(409).json("Can't update data");
            }
            if (data) {
                console.log(JSON.stringify(data));
                return res.status(200).json("Profile updated successfully");
            }
        });
}


exports.profileDelete = function(req, res){

    userModel.findOneAndDelete({"username" : req.session.username}, function (err, del) {
        if (err){
            return res.status(409).json({"message" : "Can't delete profile" });
        } if (del){
            if (req.session){
                return res.status(200).json({"message" : "Profile " + del.username+ " removed successfully" });
                req.session.destroy();
            }

        }

    })

}

exports.profileGet = function (req, res){

    userModel.findOne({'username': req.session.username}, function(err, prof){
        if (err) {
            return res.status(409).json({"message" : "username not found"});
        } if (prof) {
            console.log(prof);
            let profile = {
                name : prof.username,
                displayname : prof.displayname,
                email : prof.email
            }
            return res.status(200).json(profile);
        }
    });
}



