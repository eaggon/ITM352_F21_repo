var express = require("express");
var app = express();
var myParser = require("body-parser");
let fs = require("fs");
let rawProducts = fs.readFileSync("products_data.json");
let products = JSON.parse(rawProducts);
let rawUsers = fs.readFileSync("users.txt").toString();
let appUsers = rawUsers ? JSON.parse(rawUsers) : [];
let generateInvoice = require('./invoice.js').generateInvoice;

app.use(myParser.urlencoded({ extended: true }));


app.post('/checkout', function (req, res, next){
    let cart = [];
    for(let i = 0; i < products.length; i++)
    {
        let quantity = req.body['quantity_'+i];
        if(quantity)
        {
            quantity = parseInt(quantity);
            if(quantity > 0)
            {
                cart.push({quantity: quantity,key: i});
            }
        }
    }
    if (cart.length === 0) 
    {
        res.redirect(
            encodeURI("products_display.html?error=Your cart is empty")
        );
    } 
    else 
    {
        res.redirect(encodeURI("/login.html?cart="+JSON.stringify(cart)));
    }
});


app.get("/invoice", function (req, res, next) {
    let queryCart = req.query.cart;
    let username = req.query.username;
    let parsedCart,userFound;

    try
    {
        userFound = findUser(username);
        parsedCart = JSON.parse(queryCart);
    }
    catch
    {
        res.redirect(encodeURI("products_display.html?error=Invalid invoice request"));
        return;
    }
    
    if (!queryCart || parsedCart.length === 0) 
    {
        if(userFound)
        {
            delete userFound.cart;
        }
        res.redirect(
            encodeURI("products_display.html?error=Your cart is empty")
        );
    }
    else if (!userFound) 
    {
        res.redirect(encodeURI("login.html?cart="+queryCart));
    } 
    else if(userFound.cart !== queryCart)
    {
        delete userFound.cart;
        res.redirect(encodeURI("products_display.html?error=Invalid invoice request"));
    }
    else 
    {
        let purchased = [];
        let parsedCart = JSON.parse(queryCart);
        for (let i = 0; i < parsedCart.length; i++)
        {
            purchased.push({...products[parsedCart[i]['key']],quantity: parsedCart[i]['quantity']});
        }
        let invoice_str = generateInvoice(purchased);
        delete userFound.cart;
        invoice_str += `<h2 style="margin: auto;padding-top: 20px;">Thank you for shopping with us, ${userFound.fullName}</h2>`;
        invoice_str += `<br><div style="text-align: center;"><a href="/products_display.html">Continue shopping</a></div>`;
        res.send(invoice_str);
    };
});

// This processes the login form
app.post("/process_login", function (request, response, next) {
    let cart = request.query.cart;
    checkUser(
        request.body["uname"],
        request.body["psw"],
        function (user, auth) {
            if (auth) 
            {
                user.cart = cart;
                response.redirect(encodeURI("/invoice?username="+user.username+"&cart="+cart));
            } 
            else 
            {
                response.redirect(
                    encodeURI("/login.html?error=Wrong username or password&cart="+cart)
                );
            }
        }
    );
});

// This processes the registration form
app.post("/process_registration", function (request, response, next) {
    let data = request.body;
    let cart = request.query.cart;
    let validator = validateUser(data);
    if (validator.success) 
    {
        let user = validator.user;
        user.cart = cart;
        registerUser(user);
        response.redirect(encodeURI("/invoice?username="+user.username+"&cart="+cart));
    } else 
    {
        response.redirect(
            encodeURI("/registration.html?error=" + validator.message+"&cart="+cart)
        );
    }
});

app.get("/load_products", function (request, response, next) {
    response.json(products);
});

app.use(express.static("./static"));


let registerUser = function (data) {
    delete data.confirmPassword;
    let writingData = [...appUsers];
    appUsers.push(data);
    let copy = {...data};
    if(copy.cart)
    {
        delete copy.cart;
    }
    writingData.push(copy);
    fs.promises.writeFile("users.txt", JSON.stringify(writingData));
};

//validate the input from the registration form
let validateUser = function (data) {
    data.username = data.username.toLowerCase();
    if (data.username.length < 4 || data.username.length > 10) {
        return {
            success: false,
            message: "Username should be between 4 and 10 characters",
        };
    }
    if (checkUserExists(data.username)) {
        return { success: false, message: "Username already exists" };
    }
    if (data.password.length < 6) {
        return {
            success: false,
            message: "Password should be at least 6 characters",
        };
    }
    if (data.password !== data.confirmPassword) {
        return { success: false, message: "Mistyped password confirmation" };
    }
    if (!isEmailValid(data.email)) {
        return { success: false, message: "Email is not valid" };
    }
    if (!/^[A-Za-z\s]+$/.test(data.fullName)) {
        return {
            success: false,
            message: "Full name should only contain letters and spaces.",
        };
    }
    if (data.fullName.length > 30) {
        return {
            success: false,
            message: "Full name should not be longer than 40 characters.",
        };
    }
    return { success: true, user: data };
};


//checks if a username is already registered
let checkUser = function (username, password, callback) {
    if (!username || !password) {
        callback({}, false);
    }
    for (let i = 0; i < appUsers.length; i++) {
        if (username.toLowerCase() === appUsers[i].username.toLowerCase() && password === appUsers[i].password) {
            callback(appUsers[i], true);
            return;
        }
    }
    callback({}, false);
};

//checks if a username is already registered
let checkUserExists = function (username) {
    for (let i = 0; i < appUsers.length; i++) {
        if (appUsers[i].username == username) {
            return true;
        }
    }
    return false;
};

let findUser = function (username) {
    for (let i = 0; i < appUsers.length; i++) {
        if (appUsers[i].username == username) {
            return appUsers[i];
        }
    }
    return false;
};

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


let listener = app.listen(8080, () => {
    console.log("server started listening on port " + listener.address().port);
});