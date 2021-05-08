var express = require('express');
var app = express();
var myParser = require("body-parser");

app.all('*', function (request, response, next) {
    console.log(request.method + ' to path ' + request.path);next();
});

app.get('/test', function (request, response, next) {
    response.send('I get test');
});

app.use(myParser.urlencoded({ extended: true }));
app.post('/process_form', function (request, response, next) {
    if(request.body['quantity_textbox'] ) { 
        the_qty = request.body['quantity_textbox'];
        if(isNonNegInt(the_qty)){
            response.send(`Thanks for purchasing ${the_qty} items!`);
            return;
        } else {
            response.redirect('./order_page.html?quantity_textbox='+the_qty);
            return;
        }
    }
    response.send(request.body);
});

app.use(express.static('./public'));

app.listen(8080, () => console.log(`listening on port 8080`)); // note the use of an anonymous function here

function isNonNegInt(q, returnErrors=false){
    if(q == '') q = 0
    var errors = []; // assume no errors at first
    if(Number(q) != q) errors.push('Not a number!'); //Check if string is a number value
    if(q < 0) errors.push('Negative value!'); //Check if it is non-negative
    if(parseInt(q) != q) errors.push('Not an interger!'); //Check that it is an interger

    return returnErrors ? errors : (errors.length == 0);
}