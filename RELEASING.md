# Releasing OpenCensus Node Packages (for Maintainers Only)

This document explains how to publish all OC Node modules at version x.y.z. Ensure that you’re following semver when choosing a version number.

## Update to latest locally

Use `git fetch` and `git checkout origin/master` to ensure you’re on the latest commit. Make sure
you have no unstaged changes. Ideally, also use `git clean -dfx` to remove all ignored and
untracked files.

## Create a new branch

Create a new branch called `x.y.z-proposal` from the current commit.

## Use Lerna to prepare each package for release

Use below command to initialize all package directories.

```bash
npm install
```

Also, use `lerna publish --skip-npm --skip-git` to bump version numbers.
Ensure that the version being bumped to is `x.y.z`. This should create some unstaged changes.

## Create a new commit

Create a new commit with the exact title: `chore(multiple): x.y.z release proposal`.

## Use the Changelog to create a GitHub Release

On [GitHub Releases](https://github.com/census-instrumentation/opencensus-node/releases),
follow the example set by recent releases to populate a summary of changes, as well as a list of
commits that were applied since the last release. `git log --oneline --no-decorate` is a good way
to get that list of commits. Save it as a draft, don’t publish it. Don’t forget the tag -- call
it `vx.y.z` and leave it pointing at `master` for now (this can be changed as long as the GitHub
release isn’t published).

## Create a new PR

Push the branch to GitHub and create a new PR with that exact name. The commit body should just
be a link to the *draft* notes. Someone who can access draft notes should approve it, looking
in particular for test passing, and whether the draft notes are satisfactory.

## Merge and pull

Merge the PR, and pull the changes locally (using the commands in the first step). Ensure that
`chore(multiple): x.y.z release proposal` is the most recent commit.

## Publish all packages

Publish the packages with Wombot (see internal documentation). First, get a
token:

```bash
# Run and follow instructions to get a 24h token
npm login --registry https://wombat-dressing-room.appspot.com
```

Go into each directory and use `npm publish` to publish the package. You can use the following
script to automate this:

```bash
lerna exec --no-bail --no-private -- npm publish --registry https://wombat-dressing-room.appspot.com
```

Verify the new latest version on npm is the released version (this may take a
few minutes to update) with:

```bash
lerna exec --no-private -- 'echo -e $(npm show $LERNA_PACKAGE_NAME dist-tags.latest --json) $LERNA_PACKAGE_NAME'
```

If any packages are not showing the correct version, try publishing them
individually by cd'ing into the package directory and running `npm publish
--registry https://wombat-dressing-room.appspot.com`.

## Publish the GitHub Release

Publish the GitHub release, ensuring that the tag points to the newly landed commit corresponding to release proposal `x.y.z`.

## Update CHANGELOG and release versions in examples
* After releasing is done, you need to update all examples to point to the latest
version.
* In addition, update the CHANGELOG.md and start new Unreleased label.
* Create a new commit with the exact title: `Post Release: update CHANGELOG, Examples and ReadMe`.
* Go through PR review and merge it to GitHub master branch.
