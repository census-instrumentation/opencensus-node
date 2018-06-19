# OpenCensus Libraries for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Node.js is an implementation of OpenCensus, a toolkit for collecting application performance and behavior monitoring data. Right now OpenCensus for Node.js supports custom tracing and automatic tracing for HTTP and HTTPS. Please visit the [OpenCensus Node.js package](https://github.com/census-instrumentation/opencensus-node/tree/master/packages/opencensus-nodejs) for usage.

The library is in alpha stage and the API is subject to change.

Please join [gitter](https://gitter.im/census-instrumentation/Lobby) for help or feedback on this project.

## Installation

Install OpenCensus with:

```bash
npm install @opencensus/nodejs
```

## Plugins

OpenCensus can collect tracing data automatically using plugins. Users can also create and use their own plugins. Currently, OpenCensus supports automatic tracing for:

- [HTTP](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-http/README.md)
- [HTTPS](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-https/README.md)

## Propagation

OpenCensus collects distributed tracing. It is able to do so by propagating span data through services. Currently, OpenCensus supports:

- [B3 Propagation](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-propagation-b3/README.md)
- [Stackdriver Propagation](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-propagation-stackdriver/README.md)

## Exporters

OpenCensus is vendor-agnostic and can upload data to any backend with various exporter implementations. Even though, OpenCensus provides support for many backends, users can also implement their own exporters for proprietary and unofficially supported backends. Currently, OpenCensus supports:

- [Stackdriver](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-stackdriver/README.md)
- [Zipkin](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-zipkin/README.md)
- [Z-Pages](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-zpages/README.md)
- [Jaeger](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-jaeger/README.md)
- [Instana](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-instana/README.md)

If no exporter is registered in the tracing instance, as default, a console log exporter is used.

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge

