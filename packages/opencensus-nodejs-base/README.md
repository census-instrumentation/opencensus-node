# OpenCensus for Node.js Base
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Node.js Base is an implementation of OpenCensus, a toolkit for
collecting application performance and behavior monitoring data.

The library is in alpha stage and the API is subject to change.

Please join [gitter](https://gitter.im/census-instrumentation/Lobby) for help or feedback on this project.

## Installation

Install OpenCensus Base with:

```bash
npm install @opencensus/nodejs-base
```

## Traces

### Automatically Instrumenting an Application

For automatic insturmentation see the `@opencensus/nodejs` package.

### Manually Instrument an Application

With `@opencensus/nodejs-base` you have a full control over instrumentation and
span creation. The base package doesn't load Continuation Local Storage (CLS)
or any instrumentation plugin by default.

```typescript
const rootSpanOptions = { name: 'your root span' };
tracing.tracer.startRootSpan(rootSpanOptions, (rootSpan) => {

    // You can create as many child spans as needed
    childSpan = tracing.tracer.startChildSpan({
        name: 'name of your child span'
    });
    // Do some operation...
    // Finish the child span at the end of it's operation
    childSpan.end();

    // Finish the root span at the end of the operation
    rootSpan.end();
});
```

### Tracing Options

 See the `@opencensus/nodejs` package for the full API documentation.
