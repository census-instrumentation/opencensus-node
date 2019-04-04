# OpenCensus Stackdriver Propagation for Node.js
[![Gitter chat][gitter-image]][gitter-url]

OpenCensus Stackdriver Propagation allow other services to create spans with the right context.

The library is in alpha stage and the API is subject to change.

## Installation

Install OpenCensus Stackdriver Propagation with:
```bash
npm install @opencensus/propagation-stackdriver
```

## Usage

To propagate span context arround services with Stackdriver Propagation, pass an instance of Stackdriver Propagation to your tracing instance. For Javascript:

```javascript
const tracing = require('@opencensus/nodejs');
const propagation = require('@opencensus/propagation-stackdriver');

const sd = propagation.v1;

tracing.start({propagation: sd});
```

Similarly for Typescript:

```typescript
import * as tracing from '@opencensus/nodejs';
import * as propagation from '@opencensus/propagation-stackdriver';

const sd = propagation.v1;

tracing.start({propagation: sd});
```

## Useful links
- For more information on OpenCensus, visit: <https://opencensus.io/>
- To checkout the OpenCensus for Node.js, visit: <https://github.com/census-instrumentation/opencensus-node>
- For help or feedback on this project, join us on [gitter](https://gitter.im/census-instrumentation/Lobby)

[gitter-image]: https://badges.gitter.im/census-instrumentation/lobby.svg
[gitter-url]: https://gitter.im/census-instrumentation/lobby?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
