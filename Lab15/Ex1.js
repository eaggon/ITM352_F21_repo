var fs = require('fs');
var express = require('express');
var app = express();

var cookieParser = require('cookie-parser');
app.use(cookieParser());

app.get('/set_cookie', function (request, response) {
// this will send a cookie to the requester
    response.cookie('name', 'Dan', { maxAge: 15*1000});
    response.send('The name cookie has been sent!');
});

app.get('/use_cookie', function (request, response) {
// this will get the name cookie from the requester repond with a message 
 // console.log( request.cookies );
  response.send(`Welcome to the Use Cookie page ${ request.cookies.name}`);
});


app.use(express.urlencoded({ extended: true }));

// var buf = new Buffer(1);
//var bufLength = buf.length;
// var bytesRead = bufLength;
var pos = 0;
var bytesRead = 0;
var filename = 'user_data.json';

if (fs.existsSync(filename)) {
    var stats = fs.statSync(filename);
    console.log(filename + ' has ' + stats["size"] + ' characters');

    /*
    var fdr = fs.openSync(filename, 'r');
    while (pos < stats["size"]) {
        bytesRead = fs.readSync(fdr, buf, 0, 1, pos);
        var bufStr = buf.toString('utf8', 0, bytesRead);
        console.log(bufStr);
        // numLinesRead += bufStr.split('\n').length - 1;
        // ret += bufStr;
        pos += bytesRead;
       }
    new_user_data_line = '\nnewuser; newpass; newuser@user.com; New User';
    fs.appendFileSync(filename, new_user_data_line);
*/
    data = fs.readFileSync(filename, 'utf-8');
    /*    .split('\n')
        .filter(Boolean);
    lines.forEach(function (item) {
        user_info = item.split(';');
        console.log(`${user_info[0]} has password ${user_info[1]}`);
    }); 
    */
   users_reg_data = JSON.parse(data);
   console.log(data);

} else {
    console.log(filename + ' does not exist!');
}



app.get("/login", function (request, response) {
    // Give a simple login form
    str = `
<body>
<form action="javascript" method="POST">
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
    the_username = request.body['username'];
    the_password = request.body['password'];
    if(typeof users_reg_data[the_username] != 'undefined') {
       if(users_reg_data[the_username].password == the_password) {
           response.send(`${the_username} is logged in`);
       } else {
           response.redirect('/login');
       }
    }
});

app.get("/register", function (request, response) {
    // Give a simple register form
    str = `
<body>
<form action="" method="POST">
<input type="text" name="username" size="40" placeholder="enter username" ><br />
<input type="password" name="password" size="40" placeholder="enter password"><br />
<input type="password" name="repeat_password" size="40" placeholder="enter password again"><br />
<input type="email" name="email" size="40" placeholder="enter email"><br />
<input type="submit" value="Submit" id="submit">
</form>
</body>
    `;
    response.send(str);
 });

 app.post("/register", function (request, response) {
    // process a simple register form
    username = request.body.username;
    users_reg_data[username] = {};
    users_reg_data[username].password = request.body.password;
    users_reg_data[username].email = request.body.email;
    console.log(users_reg_data);
    fs.writeFileSync(filename,JSON.stringify(users_reg_data));
    response.send('registerd!');
 });
app.listen(8080, () => console.log(`listening on port 8080`));