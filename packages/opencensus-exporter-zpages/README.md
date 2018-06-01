# OpenCensus Zpages Exporter for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus for Node.js is an implementation of OpenCensus, a toolkit for collecting application performance and behavior monitoring data. 

The library is in alpha stage and the API is subject to change.

Please join [gitter](https://gitter.im/census-instrumentation/Lobby) for help or feedback on this project.

## Using Zpages Exporter

Package Zpages implements a collection of HTML pages that display stats and trace data.

### Installing the package

```node
npm install @opencensus/nodejs
npm install @opencensus/exporter-zpages
```

### Importing the Zpages classes

Two classes of the Zpages package are required for the Zpages Exporter works. The nodejs package is required for instrumentation.

```typescript
import * as tracing from '@opencensus/nodejs';
import {ZpagesExporter, ZpagesExporterOptions} from '@opencensus/zpages-exporter';
```

or

```javascript
 import * as zpagesExporter from '@opencensus/zpages-exporter';
```

Using javascript:

```javascript
const tracing = require('@opencensus/nodejs');
const zpagesExporter = require('@opencensus/zpages-exporter');
```

### Creating the Zpages options

To run the Zpages it's necessary to set some options. You can use the interface ZpagesExporterOptions for this.

```typescript
const options = {
  port: 8080, //default
  startServer: true, //default
  spanNames: ['predefined/span1', 'predefined/span2']
} as zpagesExporter.ZpagesExporterOptions;
```

The Zpages always run on localhost, but you can change the port in the options. If the option **startServer** is true, the Zpages server will start when a new Zpages instance is created. It's also possible to define some predefined span names. These empty spans will be listed on Zpages.

### Creating a Zpages instance

To create a new Zpages instance it's necessary to pass the Zpages options as parameter.

```typescript
const zpages = new zpagesExporter.ZpagesExporter(options);
```

### Zpages instrumentation

Use the tracing singleton from nodejs package.

```typescript
tracing.start({exporter: zpages});
```

or

```typescript
tracing.start();
tracing.registerExporter(zpages);
```

### Starting the Zpages server

If options.startServer = false then the server can be started calling startServer method:

```typescript
zpages.startServer();
```

The server will run at http:\\\localhost:port.

### Browsing the Zpages pages

There are four pages you can browse.

**/tracez** - Trace list.

**/traceconfigz** - Trace settings.

**/rpcz** - RPC stats *(not yet implemented)*.

**/stats** - Stats page *(not yet implemented)*.

### Stoping the Zpages server

If it is necessary to stop the server programmatically, use this command:

```typescript
zpages.stopServer();
```

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
