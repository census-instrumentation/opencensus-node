var fs = require('fs');
var tracing = require('opencensus-nodejs').addZipkin('http://localhost:9411/api/v2/spans', 'automatic_service');
tracing.start();


var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('Hello World!');
    res.end();
}).listen(8080);
