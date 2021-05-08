var express = require('express');
var app = express();
var myParser = require("body-parser");
app.use(myParser.urlencoded({ extended: true }));
var fs = require('fs');

//user_data = require('./user_data.json');
// Read user data file
var user_data_file = './user_data.json';
if(fs.existsSync(user_data_file)){
    var file_stats = fs.statSync(user_data_file);
    console.log(`${user_data_file} has ${file_stats["size"]} characters.`);
    var user_data = JSON.parse(fs.readFileSync('./user_data.json', 'utf-8'));
} else {
console.log(`${user_data_file} does not exist!`);
}

console.log(user_data);

app.get('/invoice.html', function(req, res, next) {
    if(typeof req.query['purchase_submit'] != 'undefined') {
        console.log(Date.now() + ': Purchase made from ip ' + req.ip + ' data: ' + JSON.stringify(req.query));
    }
    next();
});

app.get("/login", function (request, response) {
    // Give a simple login form
    str = `
<body>
<form action="" method="POST">
<input type="text" name="username" size="40" placeholder="enter username" ><br />
<input type="password" name="password" size="40" placeholder="enter password"><br />
<input type="submit" value="Submit" id="submit">
</form>
</body>
    `;
    response.send(str);
 });

app.post("/login", function (request, response) {
    // Process login form POST and redirect to logged in page if ok, back to login page if not

});

app.use(express.static('./static'));

var listener = app.listen(8080, () => { console.log('server started listening on port ' + listener.address().port) });