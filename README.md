<div align="center">
<h1>babel-macros 🎣</h1>

Enables zero-config, importable babel plugins

</div>

<hr />

[![Build Status][build-badge]][build]
[![Code Coverage][coverage-badge]][coverage]
[![version][version-badge]][package]
[![downloads][downloads-badge]][npmchart]
[![MIT License][license-badge]][LICENSE]

[![All Contributors](https://img.shields.io/badge/all_contributors-9-orange.svg?style=flat-square)](#contributors)
[![PRs Welcome][prs-badge]][prs]
[![Donate][donate-badge]][donate]
[![Code of Conduct][coc-badge]][coc]

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter]

<a href="https://app.codesponsor.io/link/PKGFLnhDiFvsUA5P4kAXfiPs/kentcdodds/babel-macros" rel="nofollow"><img src="https://app.codesponsor.io/embed/PKGFLnhDiFvsUA5P4kAXfiPs/kentcdodds/babel-macros.svg" style="width: 888px; height: 68px;" alt="Sponsor" /></a>

## The problem

Check out <a href="https://babeljs.io/blog/2017/09/11/zero-config-with-babel-macros" rel="nofollow">this guest post</a> on the Babel.js blog for a complete write up on the problem, motivation, and solution. 

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

## Table of Contents
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Usage](#usage)
- [FAQ](#faq)
- [Inspiration](#inspiration)
- [Other Solutions](#other-solutions)
- [Contributors](#contributors)
- [LICENSE](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

This module is distributed via [npm][npm] which is bundled with [node][node] and
should be installed as one of your project's `devDependencies`:

```
npm install --save-dev babel-macros
```

## Usage

Are you trying to use `babel-macros`? Go to
[`other/docs/user.md`](https://github.com/kentcdodds/babel-macros/blob/master/other/docs/user.md).

Are you trying to make your own macros that works with `babel-macros`? Go to
[`other/docs/author.md`](https://github.com/kentcdodds/babel-macros/blob/master/other/docs/author.md).
(you should probably read the user docs too).

## FAQ

### What's the difference between babel plugins and macros?

Suppose we have a plugin `node-eval`, which evaluates a node expression at compile time.

If we used `babel-plugin-node-eval`, it would look like this:

1. Add `babel-plugin-node-eval` to `.babelrc`
2. Use it in a code:

```js
const val = nodeEval`fs.readDirSync('./fleet')`

// ↓ ↓ ↓  compiles to  ↓ ↓ ↓

const val = ['red_leader', 'blue_leader']
```

Instead, if there were a macro called `node-eval.macro`, we could use
it like this:

1. Add `babel-macros` to `.babelrc` (only once for all macros)
2. Use it in a code:

```js
import nodeEval from 'node-eval.macro'
const val = nodeEval`fs.readDirSync('./fleet')`

// ↓ ↓ ↓  compiles to  ↓ ↓ ↓

const val = ['red_leader', 'blue_leader']
```

Advantages:

- requires only one entry in `.babelrc` for all macros used in project
- boilerplates, like Create React App ([soon hopefully][cra-issue]), might already support `babel-macros`, so no configuration is needed
- it's explicit, that `node-eval` is macro and does something with the code at compile time
- macros are safer and easier to write, because they receive exactly the AST node to process

> By the way, something like `node-eval` actually exists and it's called [babel-plugin-preval][preval].

### In what order are macros executed?

In the same order as imported. The order of execution is clear, explicit
and in full control of the user:

```js
import nodeEval from 'node-eval.macro'
import css from 'css-in-js.macro'

# First are evaluated `node-eval` macros, then `css` macros
```

This differs from the current situation with babel plugins where
it's prohibitively difficult to control the order plugins run in
a particular file.

### Does it work with tagged template literals only?

No! Any AST node type is supported.

It can be tagged template literal:

```js
import eval from 'eval.macro'
const val = eval`7 * 6`
```

A function:

```js
import eval from 'eval.macro'
const val = eval('7 * 6')
```

JSX Element:

```js
import Eval from 'eval.macro'
const val = <Eval>7 * 6</Eval>
```

Really, anything...

See the [testing snapshot](https://github.com/kentcdodds/babel-macros/blob/master/src/__tests__/__snapshots__/index.js.snap) for more examples.

### How about implicit optimizations at compile time?

All examples above were *explicit* - a macro was imported and then evaluated
with a specific AST node.

Completely different story are *implicit* babel plugins, like
[transform-react-constant-elements](https://babeljs.io/docs/plugins/transform-react-constant-elements/),
which process whole AST tree.

Explicit is often a better pattern than implicit because it requires others to understand
how things are globally configured. This is in this spirit are `babel-macros` designed.
However, some things _do_ need to be implicit, and those kinds of babel plugins can't be
turned into macros.

## Inspiration

- [threepointone/babel-macros](https://github.com/threepointone/babel-macros)
- [facebookincubator/create-react-app#2730][cra-issue]

## Other Solutions

- [sweetjs](http://sweetjs.org/)
- [babel-plugin-macros](https://github.com/codemix/babel-plugin-macros)

## Contributors

Thanks goes to these people ([emoji key][emojis]):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
| [<img src="https://avatars.githubusercontent.com/u/1500684?v=3" width="100px;"/><br /><sub>Kent C. Dodds</sub>](https://kentcdodds.com)<br />[💻](https://github.com/kentcdodds/babel-macros/commits?author=kentcdodds "Code") [📖](https://github.com/kentcdodds/babel-macros/commits?author=kentcdodds "Documentation") [🚇](#infra-kentcdodds "Infrastructure (Hosting, Build-Tools, etc)") [⚠️](https://github.com/kentcdodds/babel-macros/commits?author=kentcdodds "Tests") | [<img src="https://avatars1.githubusercontent.com/u/18808?v=3" width="100px;"/><br /><sub>Sunil Pai</sub>](https://github.com/threepointone)<br />[🤔](#ideas-threepointone "Ideas, Planning, & Feedback") | [<img src="https://avatars3.githubusercontent.com/u/1341513?v=3" width="100px;"/><br /><sub>Stephen Scott</sub>](http://suchipi.com/)<br />[💬](#question-suchipi "Answering Questions") [📖](https://github.com/kentcdodds/babel-macros/commits?author=suchipi "Documentation") | [<img src="https://avatars1.githubusercontent.com/u/767261?v=4" width="100px;"/><br /><sub>Michiel Dral</sub>](http://twitter.com/dralletje)<br />[🤔](#ideas-dralletje "Ideas, Planning, & Feedback") | [<img src="https://avatars2.githubusercontent.com/u/662750?v=4" width="100px;"/><br /><sub>Kye Hohenberger</sub>](https://github.com/tkh44)<br />[🤔](#ideas-tkh44 "Ideas, Planning, & Feedback") | [<img src="https://avatars1.githubusercontent.com/u/11481355?v=4" width="100px;"/><br /><sub>Mitchell Hamilton</sub>](https://hamil.town)<br />[💻](https://github.com/kentcdodds/babel-macros/commits?author=mitchellhamilton "Code") [⚠️](https://github.com/kentcdodds/babel-macros/commits?author=mitchellhamilton "Tests") | [<img src="https://avatars1.githubusercontent.com/u/1288694?v=4" width="100px;"/><br /><sub>Justin Hall</sub>](https://github.com/wKovacs64)<br />[📖](https://github.com/kentcdodds/babel-macros/commits?author=wKovacs64 "Documentation") |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| [<img src="https://avatars3.githubusercontent.com/u/1903016?v=4" width="100px;"/><br /><sub>Brian Pedersen</sub>](https://github.com/PiereDome)<br />[💻](https://github.com/kentcdodds/babel-macros/commits?author=PiereDome "Code") [📖](https://github.com/kentcdodds/babel-macros/commits?author=PiereDome "Documentation") | [<img src="https://avatars3.githubusercontent.com/u/4495237?v=4" width="100px;"/><br /><sub>Andrew Palm</sub>](https://github.com/apalm)<br />[💻](https://github.com/kentcdodds/babel-macros/commits?author=apalm "Code") |
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
[version-badge]: https://img.shields.io/npm/v/babel-macros.svg?style=flat-square
[package]: https://www.npmjs.com/package/babel-macros
[downloads-badge]: https://img.shields.io/npm/dm/babel-macros.svg?style=flat-square
[npmchart]: http://npmcharts.com/compare/babel-macros
[license-badge]: https://img.shields.io/npm/l/babel-macros.svg?style=flat-square
[license]: https://github.com/kentcdodds/babel-macros/blob/master/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: http://makeapullrequest.com
[donate-badge]: https://img.shields.io/badge/$-support-green.svg?style=flat-square
[donate]: http://kcd.im/donate
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/kentcdodds/babel-macros/blob/master/other/CODE_OF_CONDUCT.md
[github-watch-badge]: https://img.shields.io/github/watchers/kentcdodds/babel-macros.svg?style=social
[github-watch]: https://github.com/kentcdodds/babel-macros/watchers
[github-star-badge]: https://img.shields.io/github/stars/kentcdodds/babel-macros.svg?style=social
[github-star]: https://github.com/kentcdodds/babel-macros/stargazers
[twitter]: https://twitter.com/intent/tweet?text=Check%20out%20babel-macros!%20https://github.com/kentcdodds/babel-macros%20%F0%9F%91%8D
[twitter-badge]: https://img.shields.io/twitter/url/https/github.com/kentcdodds/babel-macros.svg?style=social
[emojis]: https://github.com/kentcdodds/all-contributors#emoji-key
[all-contributors]: https://github.com/kentcdodds/all-contributors
[preval]: https://github.com/kentcdodds/babel-plugin-preval
[cra-issue]: https://github.com/facebookincubator/create-react-app/issues/2730
