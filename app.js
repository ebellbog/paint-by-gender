var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var router = require('./routes');

var app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use('/',router);

var port = process.env.PORT || 3000;
app.listen(port);
console.log('App running on port '+port);
