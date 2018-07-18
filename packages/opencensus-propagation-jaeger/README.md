# OpenCensus Jaeger Format Propagation for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Jaeger Format Propagation sends a span context on the wire in an HTTP request, allowing other services to create spans with the right context.

This project is still at an early stage of development. It's subject to change.

## Installation

Install OpenCensus Jaeger Propagation with:
```bash
npm install @opencensus/propagation-jaeger
```

## Usage

To propagate span context arround services with Jaeger Propagation, pass an instance of Jaeger Propagation to your tracing instance. For Javascript:

```javascript
const tracing = require('@opencensus/nodejs');
const propagation = require('@opencensus/propagation-jaeger');

const jaeger = new propagation.JaegerFormat();

tracing.start({propagation: jaeger});
```

Similarly for Typescript:

```typescript
import * as tracing from '@opencensus/nodejs';
import { JaegerFormat } from '@opencensus/propagation-jaeger';

const jaeger = new JaegerFormat();

tracing.start({propagation: jaeger});
```

## Useful links
- To know more about Jaeger Format propagation, visit: <https://www.jaegertracing.io/docs/client-libraries/>
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
