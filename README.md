# OpenCensus - A stats collection and distributed tracing framework
[![Gitter chat][gitter-image]][gitter-url]
![Node Version][node-img]
[![NPM Published Version][npm-img]][npm-url]
[![codecov][codecov-image]][codecov-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
![Apache License][license-image]

OpenCensus Node.js is an implementation of OpenCensus, a toolkit for collecting application performance and behavior monitoring data. It currently includes 3 apis: stats, tracing and tags. Please visit the [OpenCensus Node.js package](https://github.com/census-instrumentation/opencensus-node/tree/master/packages/opencensus-nodejs) for tracing usage and [OpenCensus Core package](https://github.com/census-instrumentation/opencensus-node/tree/master/packages/opencensus-core) for stats usage.

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
- [HTTP2](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-http2/README.md)
- [GRPC](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-grpc/README.md)

## Propagation

OpenCensus collects distributed tracing. It is able to do so by propagating span data through services. Currently, OpenCensus supports:

- [B3 Propagation](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-propagation-b3/README.md)
- [Stackdriver Propagation](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-propagation-stackdriver/README.md)
- [Trace Context Propagation](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-propagation-tracecontext/README.md)
- [Binary Format Propagation](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-propagation-binaryformat/README.md)

## Exporters

OpenCensus is vendor-agnostic and can upload data to any backend with various exporter implementations. Even though, OpenCensus provides support for many backends, users can also implement their own exporters for proprietary and unofficially supported backends. Currently, OpenCensus supports:

#### Trace exporters
- [Stackdriver](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-stackdriver/README.md)
- [Jaeger](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-jaeger/README.md)
- [Zipkin](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-zipkin/README.md)
- [Instana](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-instana/README.md)

#### Stats/Metrics exporters
- [Stackdriver](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-stackdriver/README.md)
- [Prometheus](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-prometheus/README.md)

#### How to setup debugging Z-Pages?
-  If the application owner wants to export in-process tracing and stats data via HTML debugging pages see this [Z-Pages](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-zpages/README.md).

If no exporter is registered in the tracing instance, as default, a console log exporter is used.

## Versioning

This library follows [Semantic Versioning](http://semver.org/).

**GA**: Libraries defined at a GA quality level are stable, and will not introduce
backwards-incompatible changes in any minor or patch releases. We will address issues and requests
with the highest priority. If we were to make a backwards-incompatible changes on an API, we will
first mark the existing API as deprecated and keep it for 18 months before removing it.

**Beta**: Libraries defined at a Beta quality level are expected to be mostly stable and we're
working towards their release candidate. We will address issues and requests with a higher priority.
There may be backwards incompatible changes in a minor version release, though not in a patch
release. If an element is part of an API that is only meant to be used by exporters or other
opencensus libraries, then there is no deprecation period. Otherwise, we will deprecate it for 18
months before removing it, if possible.

**Alpha**: Libraries defined at a Alpha quality level can be unstable and could cause crashes or data loss. Alpha software may not contain all of the features that are planned for the final version. The API is subject to change.

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[codecov-image]: https://codecov.io/gh/census-instrumentation/opencensus-node/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/census-instrumentation/opencensus-node
[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
[npm-url]: https://www.npmjs.com/package/@opencensus/exporter-prometheus
[npm-img]: https://badge.fury.io/js/%40opencensus%2Fexporter-prometheus.svg
[node-img]: https://img.shields.io/node/v/@opencensus/exporter-prometheus.svg
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[snyk-image]: https://snyk.io/test/github/census-instrumentation/opencensus-node/badge.svg?style=flat
[snyk-url]: https://snyk.io/test/github/census-instrumentation/opencensus-node

## LICENSE

Apache License 2.0
