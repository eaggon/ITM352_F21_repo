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


//this is used to submit a checkout
app.post('/checkout', function (req, res, next){
    let cart = [];
    //add each product to the cart
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
    //if the cart is empty, redirect to the store with an error message
    if (cart.length === 0) 
    {
        res.redirect(
            encodeURI("products_display.html?error=Your cart is empty")
        );
    }
    //validate that there is enough currently enough inventory to satisfy quantities in the cart
    let validator = validateInventory(cart);
    let inventoryError = validator.inventoryError;
    let inventoryNames = validator.inventoryNames;
    cart = validator.cart;

    //if there is not enough inventory, redirect to the store with an error message and the cart to the user keeps their valid purchases
    if(inventoryError)
    {
        let inventoryMessage = "Your order exceeds our inventory for the following items: " + inventoryNames.join(', ');
        res.redirect(
            encodeURI("products_display.html?error=" + inventoryMessage + "&invError="+JSON.stringify(cart))
        );
    }
    //if there is enough inventory, redirect to the login page
    else 
    {
        res.redirect(encodeURI("/login.html?cart="+JSON.stringify(cart)));
    }
});


//this is used to create an invoice
app.get("/invoice", function (req, res, next) {
    let queryCart = req.query.cart;
    let username = req.query.username;
    let parsedCart,userFound;
    let isNewUser = req.query.newUser;

    //validate that the username exists and parse the cart from the url
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

    //it there is no cart in the url or it is empty, redirect to the store with an error message
    if (!queryCart || parsedCart.length === 0) 
    {
        //if the username currently has a cart, delete it, as only a malicious interaction with the app would lead here
        if(userFound)
        {
            delete userFound.cart;
        }
        res.redirect(
            encodeURI("products_display.html?error=Your cart is empty")
        );
    }
    //if the user was not found, redirect to the login page
    else if (!userFound) 
    {
        res.redirect(encodeURI("login.html?cart="+queryCart));
    }
    //if the user currently has a cart, different from the one in the query, delete it, as only a malicious interaction with the app would lead here
    else if(userFound.cart !== queryCart)
    {
        delete userFound.cart;
        res.redirect(encodeURI("products_display.html?error=Invalid invoice request"));
    }
    
    //validate that there is enough currently enough inventory to satisfy quantities in the cart
    let validator = validateInventory(parsedCart);
    let inventoryError = validator.inventoryError;
    let inventoryNames = validator.inventoryNames;
    parsedCart = validator.cart;
    
    //if there is not enough inventory, redirect to the store with an error message and the cart to the user keeps their valid purchases
    if(inventoryError)
    {
        let inventoryMessage = "";
        //if the user requesting the invoice was new, let them know their account has been created, despite lack of inventory for their cart
        if(isNewUser)
        {
            inventoryMessage += "Your account has been registered successfully. ";
            inventoryMessage += "However, your order exceeds our inventory for the following items: ";
            inventoryMessage += inventoryNames.join(', ');
        }
        else
        {
            inventoryMessage += "Your order exceeds our inventory for the following items: ";
            inventoryMessage += inventoryNames.join(', ');
        }
        delete userFound.cart;
        res.redirect(
            encodeURI("products_display.html?error=" + inventoryMessage + "&invError="+JSON.stringify(parsedCart))
        );
    }
    //if there is enough inventory, generate and send the invoice
    else
    {
        let purchased = [];
        for (let i = 0; i < parsedCart.length; i++)
        {
            products[parsedCart[i]['key']].inventory -= parsedCart[i]['quantity'];
            purchased.push({...products[parsedCart[i]['key']],quantity: parsedCart[i]['quantity']});
        }
        let invoice_str = generateInvoice(purchased);
        delete userFound.cart;
        invoice_str += `<h2 style="margin: auto;padding-top: 20px;">Thank you for shopping with us, ${userFound.fullName}</h2>`;
        invoice_str += `<br><div style="text-align: center;"><a href="/products_display.html">Continue shopping</a></div>`;
        res.send(invoice_str);
    }
});

// This processes the login form
app.post("/process_login", function (request, response, next) {
    let cart = request.query.cart;
    //validate that the username and password represent a valid user
    getUser(
        request.body["uname"],
        request.body["psw"],
        function (user, auth) {
            if (auth) 
            {
                //if they are valid, redirect to the invoice page
                user.cart = cart;
                response.redirect(encodeURI("/invoice?username="+user.username+"&cart="+cart));
            } 
            else 
            {
                //if they are not valid, redirect to the login page with an error message
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
    //validate the user information
    let validator = validateUser(data);
    //if the information is valid, register the user and redirect to the invoice page
    if (validator.success) 
    {
        let user = validator.user;
        user.cart = cart;
        registerUser(user);
        response.redirect(encodeURI("/invoice?username="+user.username+"&cart="+cart+"&newUser=1"));
    } 
    //if the information is not valid, redirect to the registration page with an error message
    else 
    {
        response.redirect(
            encodeURI("/registration.html?error=" + validator.message+"&cart="+cart)
        );
    }
});


//this is used to load the products by the front end store
app.get("/load_products", function (request, response, next) {
    response.json(products);
});

app.use(express.static("./static"));


//takes in the cart and validates if there is enough stock for each item
let validateInventory = function(cart)
{
    let inventoryError = false;
    let inventoryNames = [];
    for(let i = 0; i < cart.length; i++)
    {
        let quantity = parseInt(cart[i].quantity);
        let prod = products[cart[i].key];
        if(quantity > parseInt(prod.inventory))
        {
            inventoryError = true;
            inventoryNames.push(prod.name);
            cart[i].error = true;
        }
    }
    return {cart: cart, inventoryError: inventoryError, inventoryNames: inventoryNames};
}


//register a user and write it to users.txt
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


//validate the input from the registration form and if the input is not valid, create an appropriate error message
let validateUser = function (data) {
    data.username = data.username.toLowerCase();
    if (data.username.length < 4 || data.username.length > 10) {
        return {
            success: false,
            message: "Username should be between 4 and 10 characters",
        };
    }
    if (findUser(data.username)) {
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


//used to validate user info on login
let getUser = function (username, password, callback) {
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


//find a user, given its username
let findUser = function (username) {
    for (let i = 0; i < appUsers.length; i++) {
        if (appUsers[i].username == username) {
            return appUsers[i];
        }
    }
    return false;
};


//validate an email address
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