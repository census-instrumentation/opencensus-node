# OpenCensus Zpages Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Zpages Exporter implements a collection of HTML pages that display stats and trace data sent from [OpenCensus Node.js](https://github.com/census-instrumentation/opencensus-node).

This project is still at an early stage of development. It's subject to change.

## Installation

```node
npm install @opencensus/nodejs
npm install @opencensus/exporter-zpages
```

## Usage

Zpages always runs on localhost, but you can change the port in the options. If the option `startServer` is set to `true`, Zpages server will start when a new Zpages instance is created. It's also possible to predefined some span names. These empty spans will be listed on Zpages.

To use Zpages, instance the exporter on your application and pass the options. For javascript:

```javascript
var tracing = require('@opencensus/nodejs');
var zpages = require('@opencensus/exporter-zipkin');

// Add your zipkin url and application name to the Zipkin options
var options = {
  port: 8080,   // default
  startServer: true,  // default
  spanNames: ['predefined/span1', 'predefined/span2']
}

var exporter = new zpages.ZpagesExporter(options);
```

Similarly for Typescript:

```typescript
import * as tracing from '@opencensus/nodejs';
import {ZpagesExporter, ZpagesExporterOptions} from '@opencensus/zpages-exporter';

// Add your zipkin url and application name to the Zipkin options
const options = {
  port: 8080,   // default
  startServer: true,  // default
  spanNames: ['predefined/span1', 'predefined/span2']
} as ZpagesExporterOptions;

const exporter = new ZpagesExporter(options);
```

Now, register the exporter and start tracing.

```javascript
tracing.start({'exporter': exporter});
```

or

```javascript
tracing.registerExporter(exporter).start();
```

### Starting the Zpages server

If `options.startServer` is set to `false`, the server can be started by calling `startServer` method:

```typescript
zpages.startServer();
```

The server will run at `http:\\localhost:port`.

### Browsing the Zpages pages

There are four pages you can browse.

- **/tracez**: Trace list.

- **/traceconfigz**: Trace settings.

- **/rpcz**: RPC stats *(not yet implemented)*.

- **/stats**: Stats page *(not yet implemented)*.

### Stoping the Zpages server

If it is necessary to stop the server programmatically, use the following command:

```typescript
zpages.stopServer();
```

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
