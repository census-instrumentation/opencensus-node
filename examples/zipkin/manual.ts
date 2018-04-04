var opencensus = require('opencensus-nodejs');
var request = require('request');
var fs = require('fs');

var tracing = opencensus.addZipkin('http://localhost:9411/api/v2/spans', 'manual_service');
var trace = tracing.Trace;


request('https://httpbin.org/get', function (error, response, body) {
    console.log('error:', error);
    console.log('statusCode:', response && response.statusCode);
    console.log('body:', body);
    
    var filename = 'results/arquivo';
    for (var i = 0; i < 10; i++) {
        fs.writeFileSync(filename + i + '.txt', body, 'utf-8');
    }
});









// var fs = require('fs');
// var tracing = opencensus.addZipkin('http://localhost:9411/api/v2/spans', 'manual_service');

// tracing.startTracer();

// var tracer = opencensus.Tracer;
// tracer.start();

// var options = {
//     name: 'GET'
// };

// var http = require('http');
// http.createServer(function (req, res) {
//     tracer.startRootSpan(options, (span) => {
//         if (span) {
//             res.writeHead(200, { 'Content-Type': 'text/html' });
//             res.write('Hello World!');
//             res.end();
//             span.end();
//         } else {
//             console.log("span is null");
//         }
//     });

// }).listen(8081);