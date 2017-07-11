<div align="center">
<h1>babel-macros 🎣</h1>

**Enables zero-config, importable babel plugins**

</div>

<hr />

[![Build Status][build-badge]][build]
[![Code Coverage][coverage-badge]][coverage]
[![Dependencies][dependencyci-badge]][dependencyci]
[![version][version-badge]][package]
[![downloads][downloads-badge]][npm-stat]
[![MIT License][license-badge]][LICENSE]

[![All Contributors](https://img.shields.io/badge/all_contributors-3-orange.svg?style=flat-square)](#contributors)
[![PRs Welcome][prs-badge]][prs]
[![Donate][donate-badge]][donate]
[![Code of Conduct][coc-badge]][coc]
[![Roadmap][roadmap-badge]][roadmap]
[![Examples][examples-badge]][examples]

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter]

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## The problem

Currently, each babel plugin in the babel ecosystem requires that you configure
it individually. This is fine for things like language features, but can be
frustrating overhead for libraries that allow for compile-time code
transformation as an optimization.

## This solution

babel-macros defines a standard interface for libraries that want to use
compile-time code transformation without requiring the user to add a babel
plugin to their build system (other than `babel-macros`, which is ideally
already in place).

<details>

<summary>Expand for more details on the motivation</summary>

For instance, many css-in-js libraries have a css tagged template string
function:

```js
const styles = css`
  .red {
    color: red;
  }
`;
```

The function compiles your css into (for example) an object with generated class
names for each of the classes you defined in your css:

```js
console.log(styles); // { red: "1f-d34j8rn43y587t" }
```

This class name can be generated at runtime (in the browser), but this has some
disadvantages:

* There is cpu usage/time overhead; the client needs to run the code to generate
  these classes every time the page loads
* There is code bundle size overhead; the client needs to receive a CSS parser
  in order to generate these class names, and shipping this makes the amount of
  js the client needs to parse larger.

To help solve those issues, many css-in-js libraries write their own babel
plugin that generates the class names at compile-time instead of runtime:

```js
// Before running through babel:
const styles = css`
  .red {
    color: red;
  }
`;
// After running through babel, with the library-specific plugin:
const styles = { red: "1f-d34j8rn43y587t" };
```

If the css-in-js library supported babel-macros instead, then they wouldn't need
their own babel plugin to compile these out; they could instead rely on
babel-macros to do it for them. So if a user already had babel-macros installed
and configured with babel, then they wouldn't need to change their babel
configuration to get the compile-time benefits of the library. This would be
most useful if the boilerplate they were using came with babel-macros out of the
box, which is what we're hoping will be true for create-react-app in the future.

Although css-in-js is the most common example, there are lots of other things
you could use `babel-macros` for, like:

* Compiling GraphQL fragments into objects so that the client doesn't need a
  GraphQL parser
* Eval-ing out code at compile time that will be baked into the runtime code,
  for instance to get a list of directories in the filesystem (see
  [preval][preval])

</details>

## Installation

This module is distributed via [npm][npm] which is bundled with [node][node] and
should be installed as one of your project's `devDependencies`:

```
npm install --save-dev babel-macros
```

## Usage

<details>

<summary>Adding the plugin to your config</summary>

#### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["babel-macros"]
}
```

#### Via CLI

```shell
babel --plugins babel-macros script.js
```

#### Via Node API

```js
require('babel-core').transform('code', {
  plugins: ['babel-macros'],
})
```

</details>

<details>

<summary>Using a macros</summary>

With the `babel-macros` plugin added to your config, we can now use a macros
that works with the `babel-macros` API. Let's assume we have such a module
in our project called `eval.macros.js`. To use it, we `import` or `require`
the macros module in our code like so:

```javascript
import MyEval from './eval.macros'
// or
const MyEval = require('./eval.macros')
```

Then we use that variable however the documentation for the macros says.
Incidentally, `eval.macros.js` actually exists in the tests for `babel-macros`
[here](eval-macros) and you can see how it transforms our code in
[the `babel-macros` snapshots][eval-snapshots].

> Note here that the real benefit is that we don't need to configure anything
> for every macros you add. We simply configure `babel-macros`, then we can
> use any macros available. This is part of the benefit of using `babel-macros`.

</details>

<details>

<summary>Writing a macros</summary>

A macros is a JavaScript module that exports a function. It can be published to
the npm registry (for generic macros, like a css-in-js library) or used locally
(for domain-specific macros, like handling some special case for your company's
localization efforts).

> Before you write a custom macros, you might consider whether
> [`babel-plugin-preval`][preval] help you do what you want as it's pretty
> powerful.

There are two parts to the `babel-macros` API:

1. The filename convention
2. The function you export

**Filename**:

The way that `babel-macros` determines whether to run a macros is based on the
source string of the `import` or `require` statement. It must match this regex:
`/[./]macros(\.js)?$/` for example:

_matches_:

```
'my.macros'
'my.macros.js'
'my/macros'
'my/macros.js'
```

_does not match_:

```
'my-macros'
'my.macros.is-sweet'
'my/macros/rocks'
```

> So long as your file can be required at a matching path, you're good. So you
> could put it in: `my/macros/index.js` and people would: `require('my/macros')`
> which would work fine.

**If you're going to publish this to npm,** the most ergonomic thing would be to
name it something that ends in `.macros`. If it's part of a larger package,
then calling the file `macros.js` or placing it in `macros/index.js` is a great
way to go as well. Then people could do:

```js
import Nice from 'nice.macros'
// or
import Sweet from 'sweet/macros'
```

**Function API**:

The macros you create should export a function. That function accepts a single
parameter which is an object with the following properties:

**state**: The state of the file being traversed. It's the second argument
you receive in a visitor function in a normal babel plugin.

**references**: This is an object that contains arrays of all the references to
things imported from macros keyed based on the name of the import. The items
in each array are the paths to the references.

<details>

<summary>Some examples:</summary>

```javascript
import MyMacros from './my.macros'

MyMacros({someOption: true}, `
  some stuff
`)

// references: { default: [BabelPath] }
```

```javascript
import {foo as FooMacros} from './my.macros'

FooMacros({someOption: true}, `
  some stuff
`)

// references: { foo: [BabelPath] }
```

```javascript
import {foo as FooMacros} from './my.macros'

// no usage...

// references: {}
```

</details>

From here, it's just a matter of doing doing stuff with the `BabelPath`s that
you're given. For that check out [the babel handbook][babel-handbook].

> One other thing to note is that after your macros has run, babel-macros will
> remove the import/require statement for you.

<details>

<summary>Testing your macros</summary>

The best way to test your macros is using [`babel-plugin-tester`][tester]:

```javascript
import path from 'path'
import pluginTester from 'babel-plugin-tester'
import plugin from 'babel-macros'

pluginTester({
  plugin,
  snapshot: true,
  tests: withFilename([
    `
      import MyMacros from '../my.macros'

      MyMacros({someOption: true}, \`
        some stuff
      \`)
    `
  ]),
})

/*
 * This adds the filename to each test so you can do require/import relative
 * to this test file.
 */
function withFilename(tests) {
  return tests.map(t => {
    const test = {babelOptions: {filename: __filename}}
    if (typeof t === 'string') {
      test.code = t
    } else {
      Object.assign(test, t)
    }
    return test
  })
}
```

There is currently no way to get code coverage for your macros this way however.
If you want code coverage, you'll have to call your macros yourself.
Contributions to improve this experience are definitely welcome!

</details>

</details>

## Inspiration

- [threepointone/babel-macros](https://github.com/threepointone/babel-macros)
- [facebookincubator/create-react-app#2730](https://github.com/facebookincubator/create-react-app/issues/2730)

## Other Solutions

- [sweetjs](http://sweetjs.org/)
- [babel-plugin-macros](https://github.com/codemix/babel-plugin-macros)

## Contributors

Thanks goes to these people ([emoji key][emojis]):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
| [<img src="https://avatars.githubusercontent.com/u/1500684?v=3" width="100px;"/><br /><sub>Kent C. Dodds</sub>](https://kentcdodds.com)<br />[💻](https://github.com/kentcdodds/babel-macros/commits?author=kentcdodds "Code") [📖](https://github.com/kentcdodds/babel-macros/commits?author=kentcdodds "Documentation") [🚇](#infra-kentcdodds "Infrastructure (Hosting, Build-Tools, etc)") [⚠️](https://github.com/kentcdodds/babel-macros/commits?author=kentcdodds "Tests") | [<img src="https://avatars1.githubusercontent.com/u/18808?v=3" width="100px;"/><br /><sub>Sunil Pai</sub>](https://github.com/threepointone)<br /> | [<img src="https://avatars3.githubusercontent.com/u/1341513?v=3" width="100px;"/><br /><sub>Stephen Scott</sub>](http://suchipi.com/)<br />[💬](#question-suchipi "Answering Questions") [📖](https://github.com/kentcdodds/babel-macros/commits?author=suchipi "Documentation") |
| :---: | :---: | :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors][all-contributors] specification.
Contributions of any kind welcome!

## LICENSE

MIT

[npm]: https://www.npmjs.com/
[node]: https://nodejs.org
[build-badge]: https://img.shields.io/travis/kentcdodds/babel-macros.svg?style=flat-square
[build]: https://travis-ci.org/kentcdodds/babel-macros
[coverage-badge]: https://img.shields.io/codecov/c/github/kentcdodds/babel-macros.svg?style=flat-square
[coverage]: https://codecov.io/github/kentcdodds/babel-macros
[dependencyci-badge]: https://dependencyci.com/github/kentcdodds/babel-macros/badge?style=flat-square
[dependencyci]: https://dependencyci.com/github/kentcdodds/babel-macros
[version-badge]: https://img.shields.io/npm/v/babel-macros.svg?style=flat-square
[package]: https://www.npmjs.com/package/babel-macros
[downloads-badge]: https://img.shields.io/npm/dm/babel-macros.svg?style=flat-square
[npm-stat]: http://npm-stat.com/charts.html?package=babel-macros&from=2016-04-01
[license-badge]: https://img.shields.io/npm/l/babel-macros.svg?style=flat-square
[license]: https://github.com/kentcdodds/babel-macros/blob/master/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: http://makeapullrequest.com
[donate-badge]: https://img.shields.io/badge/$-support-green.svg?style=flat-square
[donate]: http://kcd.im/donate
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/kentcdodds/babel-macros/blob/master/other/CODE_OF_CONDUCT.md
[roadmap-badge]: https://img.shields.io/badge/%F0%9F%93%94-roadmap-CD9523.svg?style=flat-square
[roadmap]: https://github.com/kentcdodds/babel-macros/blob/master/other/ROADMAP.md
[examples-badge]: https://img.shields.io/badge/%F0%9F%92%A1-examples-8C8E93.svg?style=flat-square
[examples]: https://github.com/kentcdodds/babel-macros/blob/master/other/EXAMPLES.md
[github-watch-badge]: https://img.shields.io/github/watchers/kentcdodds/babel-macros.svg?style=social
[github-watch]: https://github.com/kentcdodds/babel-macros/watchers
[github-star-badge]: https://img.shields.io/github/stars/kentcdodds/babel-macros.svg?style=social
[github-star]: https://github.com/kentcdodds/babel-macros/stargazers
[twitter]: https://twitter.com/intent/tweet?text=Check%20out%20babel-macros!%20https://github.com/kentcdodds/babel-macros%20%F0%9F%91%8D
[twitter-badge]: https://img.shields.io/twitter/url/https/github.com/kentcdodds/babel-macros.svg?style=social
[emojis]: https://github.com/kentcdodds/all-contributors#emoji-key
[all-contributors]: https://github.com/kentcdodds/all-contributors
[eval-macros]: https://github.com/kentcdodds/babel-macros/blob/master/src/__tests__/fixtures/eval.macros.js
[eval-snapshots]: https://github.com/kentcdodds/babel-macros/blob/master/src/__tests__/__snapshots__/index.js.snap
[preval]: https://github.com/kentcdodds/babel-plugin-preval
[tester]: https://github.com/babel-utils/babel-plugin-tester
[babel-handbook]: https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md
