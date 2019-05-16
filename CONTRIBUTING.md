# Contributing Guide

The opencensus-node is written in TypeScript.

The command `npm test` tests code the same way that our CI will test it.
This is a convenience command for a number of steps, which can run separately if needed:

- `npm run compile` compiles the code, checking for type errors.
- `npm run bootstrap` Bootstrap the packages in the current Lerna repo. Installs all of their dependencies and links any cross-dependencies.

# How to become a contributor and submit your own code

## Contributor License Agreements

We'd love to accept your patches! Before we can take them, we have to jump a couple of legal hurdles.

Please fill out either the individual or corporate Contributor License Agreement (CLA).

  * If you are an individual writing original source code and you're sure you own the intellectual property, then you'll need to sign an [individual CLA](http://code.google.com/legal/individual-cla-v1.0.html).
  * If you work for a company that wants to allow you to contribute your work, then you'll need to sign a [corporate CLA](http://code.google.com/legal/corporate-cla-v1.0.html).

Follow either of the two links above to access the appropriate CLA and instructions for how to sign and return it. Once we receive it, we'll be able to accept your pull requests.

## Contributing A Patch

1. Submit an issue describing your proposed change to the repo in question.
1. The repo owner will respond to your issue promptly.
1. Fork the desired repo, develop and test your code changes.
1. In the directory for each of the packages that you have made changes in, run `npm run test` to run the tests and check coverage. Ensure there are no new failures after your changes. 
1. From the top level directory run `npm run check` and address any failures. This builds all of the packages and runs the linter. This ensures changes you have made do not affect any of the packages (which can happen even if you have not changed them specifically).
1. The easiest way to fix linter errors is to run `npm run fix`
1. Submit a pull request.
1. If your proposed change is accepted, and you haven't already done so, sign a Contributor License Agreement (see details above).
