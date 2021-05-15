var express = require("express");
var app = express();
var myParser = require("body-parser");
let fs = require("fs");
let session = require("express-session");
let nodemailer = require("nodemailer");
let rawProducts = fs.readFileSync("products_data.json");
let products = JSON.parse(rawProducts);
let rawUsers = fs.readFileSync("users.txt").toString();
let appUsers = rawUsers ? JSON.parse(rawUsers) : [];
let generateInvoice = require('./invoice.js').generateInvoice;
let {isEmailValid, checkPassword, encryptPassword} = require('./userUtils.js');

app.use(myParser.urlencoded({ extended: true }));

//user session to keep track of user and cart
app.use(
    session({
        secret: "on3K3yT0Rul3Th3m@ll",
        resave: true,
        saveUninitialized: true,
        cookie: { httpOnly: true, maxAge: 3600000 },
    })
);

//generate an empty cart on any request if one does not already exist
app.all("*", function (request, response, next) {
    // console.log(`Got a ${request.method} to path ${request.path} from ${JSON.stringify(request.session)}`);
    // need to initialize an object to store the cart in the session. We do it when there is any request so that we don't have to check it exists
    // anytime it's used
    if (typeof request.session.cart == "undefined") {
        request.session.cart = [];
    }
    next();
});

//add item to cart
app.get("/add_to_cart/:item", function (request, response) {
    let item = JSON.parse(request.params.item);
    let product = { ...products[item.category][item.product] };
    let found = false;
    // if quantity is 0, remove the item from the cart if it exists
    if(parseInt(item.quantity) === 0)
    {
        let cart = request.session.cart;
        for(let i = 0; i < cart.length; i++)
        {
            if(cart[i].id.toString() === product.id.toString())
            {
                found = i;
            }
        }
        if(found !== false)
        {
            request.session.cart.splice(found,1);
        }
    }
    else
    {
        // if item is in cart,update quanitty,else add the item
        request.session.cart.map(function (order) {
            if (order.id === product.id) {
                found = true;
                order.quantity = item.quantity;
            }
            return order;
        });
        if (!found) {
            product.quantity = item.quantity;
            request.session.cart.push(product);
        }
    }
    response.json(request.session.cart);
});

app.get('/logout',function (req, res, next){
    if(req.session.user)
    {
        delete req.session.user;
        req.session.cart = [];
        res.redirect('/products_display.html');
    }
    else
    {
        res.redirect('/products_display.html');
    }
})

//send back the fullname of the suer
app.get('/username', function (req, res, next) {
    if(req.session.user)
    {
        res.json({name: req.session.user.fullName});
    }
    else
    {
        res.json({name: ""});
    }
});

app.get('/checkout', function (req, res, next){
    if (req.session.cart.length === 0) {
        res.redirect(
            encodeURI("products_display.html?error=Your cart is empty")
        );
    //if the user is not logged redirect to login
    } else if (!req.session.user) {
        console.log(req.session.cart);
        res.redirect("/login.html");
    //mailing taken from assignment 3 examples
    } else {
        res.redirect("/invoice.html");
    }
});


app.get('/finalcheckout/:value',function (req, res, next){
    let accepted = req.params.value === "accepted" ? true : false;
    if(accepted)
    {
        res.redirect('/invoice');
    }
    else
    {
        req.session.cart = [];
        res.redirect('/products_display.html');
    }
});

app.get("/invoice", function (req, res, next) {
    //if the cart is empty redirect to the product page with an error
    if (req.session.cart.length === 0) {
        res.redirect(
            encodeURI("products_display.html?error=Your cart is empty")
        );
    //if the user is not logged redirect to login
    } else if (!req.session.user) {
        console.log(req.session.cart);
        res.redirect("login.html");
    //mailing taken from assignment 3 examples
    } else {
        let shopping_cart = [...req.session.cart];
        let user = req.session.user;
        let invoice_str = generateInvoice(shopping_cart);
        invoice_str += `<h2 style="margin: auto;padding-top: 20px;">Thank you for shopping with us, ${user.fullName}</h2>`;
        //empty the cart
        req.session.cart = [];
        // Set up mail server. Only will work on UH Network due to security restrictions
        var transporter = nodemailer.createTransport({
            host: "mail.hawaii.edu",
            port: 25,
            secure: false, // use TLS
            tls: {
                // do not fail on invalid certs
                rejectUnauthorized: false,
            },
        });

        var mailOptions = {
            from: "candy_store@bogus.com",
            to: user.email,
            subject: "Your sweet as art invoice",
            html: invoice_str,
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                invoice_str +=
                    `<br><div style="text-align: center;">There was an error and your invoice could not be emailed :(</div><br><div style="text-align: center;"><a href="/products_display.html">Continue shopping</a></div>`;
            } else {
                invoice_str += `<br><div style="text-align: center;">Your invoice was mailed to ${user.email}</div><br><div style="text-align: center;"><a href="/products_display.html">Continue shopping</a></div>`;
            }
            res.send(invoice_str);
        });
    }
});

// This processes the login form
app.post("/process_login", function (request, response, next) {

    checkUser(
        request.body["uname"],
        request.body["psw"],
        function (user, auth) {
            if (auth) {
                request.session.user = user;
                response.redirect("/checkout");
            } else {
                response.redirect(
                    encodeURI("/login.html?error=Wrong username or password")
                );
            }
        }
    );
});

// This processes the registration form
app.post("/process_registration", function (request, response, next) {
    let data = request.body;
    let validator = validateUser(data);
    if (validator.success) {
        registerUser(validator.user);
        request.session.user = {fullName: validator.user.fullName, email: validator.user.email,username: validator.user.username};
        response.redirect("/checkout");
        
    } else {
        response.redirect(
            encodeURI("/registration.html?error=" + validator.message)
        );
    }
});

//load products from a category
app.get("/load_products/:category", function (request, response, next) {
    let category = request.params.category;
    let cart = request.session.cart;
    let requestedProducts = [];
    for (let i = 0; i < products[category].length; i++) {
        let product = { ...products[category][i] };
        cart.map(function (inCartItem) {
            if (inCartItem.id == product.id) {
                product.quantity = inCartItem.quantity;
            }
        });
        requestedProducts.push(product);
    }
    response.json(requestedProducts);
});

app.use(express.static("./static"));

app.get("/load_cart", function (request, response, next) {
    if(request.session.cart.length === 0)
    {
        response.json({error: "cart"});
    }
    else if(!request.session.user)
    {
        response.json({error: "login"});
    }
    else
    {
        let cart = request.session.cart;
        response.json(cart);
    }
});

let writeUsers = async function () {
    await fs.promises.writeFile("users.txt", JSON.stringify(appUsers));
};

let registerUser = function (data) {
    //ecrypt the password and write the suer
    encryptPassword(data.password, function (hash) {
        delete data.confirmPassword;
        data.password = hash;
        appUsers.push(data);
        writeUsers();
    });
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
    if (data.password.length <= 6) {
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
        if (username.toLowerCase() === appUsers[i].username.toLowerCase()) {
            checkPassword(password, appUsers[i].password, function (result) {
                let resultedUser = result ? { ...appUsers[i] } : {};
                callback(resultedUser, result);
            });
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

let listener = app.listen(8080, () => {
    console.log("server started listening on port " + listener.address().port);
});