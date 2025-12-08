var express = require('express');
var sphp = require('sphp')

var app = express();
var server = app.listen(8000)

app.use(sphp.express('content/'))
app.use(express.static('static/'))

var sphpOptions = {
    cgiEngine: "/usr/bin/php-cgi"
}
sphp.setOptions(sphpOptions)