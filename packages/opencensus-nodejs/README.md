# OpenCensus for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Node.js is an implementation of OpenCensus, a toolkit for collecting application performance and behavior monitoring data. Right now OpenCensus for Node.js supports custom tracing and automatic tracing for HTTP, HTTPS, HTTP2 and MongoDB.

The library is in alpha stage and the API is subject to change.

Please join [gitter](https://gitter.im/census-instrumentation/Lobby) for help or feedback on this project.

## Installation

Install OpenCensus with:

```bash
npm install @opencensus/nodejs
```

## Traces

### Instrumenting an Application

OpenCensus for Node.js has automatic instrumentation for [HTTP](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-http/README.md), [HTTPS](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-https/README.md), [HTTP2](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-http2/README.md), [gRPC](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-grpc/README.md) and [MongoDB](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-mongodb/README.md) out of the box. This means that spans are automatically created for operations of those packages. To use it, simply start the tracing instance.

```javascript
var tracing = require('@opencensus/nodejs');
tracing.start();
```

Similarly for Typescript:

```typescript
import * as tracing from '@opencensus/nodejs';
tracing.start();
```

### Manualy Instrument an Application

In addition to automatic tracing, it is possible to manualy create your own root and child spans. 

```typescript
const rootSpanOptions = { name: 'your root span' };
tracing.tracer.startRootSpan(rootSpanOptions, (rootSpan) => {

    // You can create as many child spans as needed
    childSpan = tracing.tracer.startChildSpan(name: 'your child span');
    // Do some operation...
    // Finish the child span at the end of it's operation
    childSpan.end();

    // Finish the root span at the end of the operation
    rootSpan.end();
});
```

### Tracing Options

Tracing has many options available to choose from. At `tracing.start()`, you can set the following:

| Options | Type | Description |
| ------- | ---- | ----------- |
| [`bufferSize`](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-core/src/trace/config/types.ts#L25) | `number` | The number of traces to be collected before exporting to a backend |
| [`bufferTimeout`](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-core/src/trace/config/types.ts#L27) | `number` | Maximum time to wait before exporting to a backend |
| [`logger`](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-core/src/trace/config/types.ts#L29) | `Logger` | A logger object |
| [`logLevel`](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-core/src/trace/config/types.ts#L47) | `number` | Level of logger - 0: disable, 1: error, 2: warn, 3: info, 4: debug |
| [`samplingRate`](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-core/src/trace/config/types.ts#L35) | `number` | Determines the span's sampling rate. Ranges from 0.0 to 1.0 |
| [`ignoreUrls`](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-core/src/trace/config/types.ts#L37) | `Array<string>` | A list of ignored (or blacklisted) URLs to not trace |
| [`propagation`](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-core/src/trace/config/types.ts#L41) | `Propagation` | A propagation instance to use |
| [`maximumLabelValueSize`](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-core/src/trace/config/types.ts#L52) | `number` | The maximum number of characters reported on a label value |
| [`plugin`](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-core/src/trace/config/types.ts#L68) | `PluginNames` | A list of trace instrumentations plugins to load |
| [`exporter`](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-core/src/trace/config/types.ts#L70) | `Exporter` | An exporter object |

## Instrumentation Plugins

OpenCensus can collect tracing data automatically using instrumentation plugins. Users can also create and use their own instrumentation plugins. Currently, OpenCensus supports automatic tracing for:

- [HTTP](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-http/README.md)
- [HTTPS](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-https/README.md)
- [HTTP2](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-http2/README.md)
- [gRPC](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-grpc/README.md)
- [MongoDB](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-instrumentation-mongodb/README.md)

## Propagation

OpenCensus collects distributed tracing. It is able to do so by propagating span data through services. Currently, OpenCensus supports:

- [B3 Propagation](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-propagation-b3/README.md)
- [Stackdriver Propagation](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-propagation-stackdriver/README.md)

## Exporters

OpenCensus can export trace data to various backends. Currently, OpenCensus supports:

- [Stackdriver](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-stackdriver/README.md)
- [Zipkin](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-zipkin/README.md)
- [Z-Pages](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-zpages/README.md)
- [Jaeger](https://github.com/census-instrumentation/opencensus-node/blob/master/packages/opencensus-exporter-jaeger/README.md)

If no exporter is registered in the tracing instance, as default, a console log exporter is used.

## Stats

### Creating Measures

In stats collection, the first step is to create the measures your are interested in. For that, you'll need an instance of `Stats` and a list of tag keys.

```typescript
const stats = new Stats();
const tagKeys = ['key1', 'key2'];

const yourMeasureInt64 = stats.createMeasureInt64('your.domain/first/measure', 'description', MeasureUnit.unit);
const yourMeasureDouble = stats.createMeasureDouble('your.domain/second/measure', 'description', MeasureUnit.unit);
```

### Creating Views

Views aggregate measures in one of the following ways: `lastValue`, `sum`, `count` and `distribution`. To create views, simply do the following:
```typescript
// Define your bucket's limit for distribution views
const buckets = [1, 10, 20, 30];
const distributionView = stats.createDistribuitionView(yourMeasure, buckets, tagKeys, 'your.domain/path/to/view/distribution', 'view description');
stats.registerView(distributionView);

const lastValueView = stats.createLastValueView(yourMeasure, tagKeys, 'your.domain/path/to/view/last/value', 'view description');
stats.registerView(lastValueView);

const sumView = stats.createSumView(yourMeasure, tagKeys, 'your.domain/path/to/view/sum', 'view description');
stats.registerView(sumView);

const countView = stats.createCountView(yourMeasure, tagKeys, 'your.domain/path/to/view/count', 'view description');
stats.registerView(countView);
```

Tags allows you to create multidimensional data by changing the value of a tag key. For example, one can create a view that aggregates the amount of bytes sent through an HTTP method, for that view, you can add a tag key called `http_status` that has values such as `ok` or `error`. By doing that, you are able to store two dimensions in one view.

### Recording Values

Once measures and views are created, a record can be made to a view by doing:

```typescript
// The tag labels should correspond to the tag keys in the view
const tagLabels = ['value_for_key_1', 'value_for_key_2'];

yourView.recordValue(tagLabels, 25);
```

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge

