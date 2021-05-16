// const saltRounds = 10;
// let bcrypt = require("bcrypt");


//taken from stackoverflow
let isEmailValid = function (email) {
    let emailRegex =
        /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
    if (!email) return false;

    if (email.length > 254) return false;

    var valid = emailRegex.test(email);
    if (!valid) return false;

    // Further checking of some things regex can't handle
    var parts = email.split("@");
    if (parts[0].length > 64) return false;

    var domainParts = parts[1].split(".");
    if (
        domainParts.some(function (part) {
            return part.length > 63;
        })
    )
        return false;

    return true;
};

//taken from the bcrypt documentation

let encryptPassword = function (password, callback) {
    // bcrypt.hash(password, saltRounds, function (err, hash) {
        // callback(hash);
    // });
    callback(password);
};

//taken from the bcrypt documentation
let checkPassword = function (password, hash, callback) {
    // bcrypt.compare(password, hash).then(function (result) {
    //     callback(result);
    // });
    if(password === hash)
    {
        callback(true);
    }
    else
    {
        callback(false);
    }
};

module.exports = {
    isEmailValid: isEmailValid,
    checkPassword: checkPassword,
    encryptPassword: encryptPassword
}