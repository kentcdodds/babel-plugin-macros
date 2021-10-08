# `babel-plugin-macros` Usage for macros authors

> See also:
> [the `user` docs](https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/user.md).

Is this your first time working with ASTs? Here are some resources:

- [Writing custom Babel and ESLint plugins with ASTs](https://youtu.be/VBscbcm2Mok?list=PLV5CVI1eNcJgNqzNwcs4UKrlJdhfDjshf):
  A 53 minute talk by [@kentcdodds](https://twitter.com/kentcdodds)
- [babel-handbook](https://github.com/thejameskyle/babel-handbook): A guided
  handbook on how to use Babel and how to create plugins for Babel by
  [@thejameskyle](https://twitter.com/thejameskyle)
- [Code Transformation and Linting](https://kentcdodds.com/workshops/#code-transformation-and-linting):
  A workshop (recording available on Frontend Masters) with exercises of making
  custom Babel and ESLint plugins

## Writing a macro

> You might appreciate
> [this example repo](https://github.com/kentcdodds/cra-macro-example) which
> shows how to write and use macros in a create-react-app application.

A macro is a JavaScript module that exports a function. Here's a simple example:

```javascript
const {createMacro} = require('babel-plugin-macros')

// `createMacro` is simply a function that ensures your macro is only
// called in the context of a babel transpilation and will throw an
// error with a helpful message if someone does not have babel-plugin-macros
// configured correctly
module.exports = createMacro(myMacro)

function myMacro({references, state, babel}) {
  // state is the second argument you're passed to a visitor in a
  // normal babel plugin. `babel` is the `babel-plugin-macros` module.
  // do whatever you like to the AST paths you find in `references`
  // read more below...
}
```

It can be published to the npm registry (for generic macros, like a css-in-js
library) or used locally (for domain-specific macros, like handling some special
case for your company's localization efforts).

> Before you write a custom macro, you might consider whether
> [`babel-plugin-preval`][preval] help you do what you want as it's pretty
> powerful.

There are two parts to the `babel-plugin-macros` API:

1. The filename convention
2. The function you export

### Filename

The way that `babel-plugin-macros` determines whether to run a macro is based on
the source string of the `import` or `require` statement. It must match this
regex: `/[./]macro(\.c?js)?$/` for example:

_matches_:

```
'my.macro'
'my.macro.js'
'my.macro.cjs'
'my/macro'
'my/macro.js'
'my/macro.cjs'
```

_does not match_:

```
'my-macro'
'my.macro.is-sweet'
'my/macro/rocks'
```

> So long as your file can be required at a matching path, you're good. So you
> could put it in: `my/macro/index.js` and people would: `require('my/macro')`
> which would work fine.

**If you're going to publish this to npm,** the most ergonomic thing would be to
name it something that ends in `.macro`. If it's part of a larger package, then
calling the file `macro.js` or placing it in `macro/index.js` is a great way to
go as well. Then people could do:

```js
import Nice from 'nice.macro'
// or
import Sweet from 'sweet/macro'
```

In addition, please publish your macro with the [`keyword`][keyword] of
`babel-plugin-macros` (note the "s"). That way folks can easily find macros by
searching for the [`babel-plugin-macros` keyword on
npm][npm-babel-plugin-macros]. In addition, and you can add this badge to the
top of your README:

[![Babel Macro](https://img.shields.io/badge/babel--macro-%F0%9F%8E%A3-f5da55.svg?style=flat-square)](https://github.com/kentcdodds/babel-plugin-macros)

```
[![Babel Macro](https://img.shields.io/badge/babel--macro-%F0%9F%8E%A3-f5da55.svg?style=flat-square)](https://github.com/kentcdodds/babel-plugin-macros)
```

### Function API

The macro you create should export a function. That function accepts a single
parameter which is an object with the following properties:

#### state

The state of the file being traversed. It's the second argument you receive in a
visitor function in a normal babel plugin.

#### babel

This is the same thing you get as an argument to normal babel plugins. It is
also the same thing you get if you `require('babel-core')`.

#### references

This is an object that contains arrays of all the references to things imported
from macro keyed based on the name of the import. The items in each array are
the paths to the references.

<details>

<summary>Some examples:</summary>

```javascript
import MyMacro from './my.macro'

MyMacro(
  {someOption: true},
  `
  some stuff
`,
)

// references: { default: [BabelPath] }
```

```javascript
import {foo as FooMacro} from './my.macro'

FooMacro(
  {someOption: true},
  `
  some stuff
`,
)

// references: { foo: [BabelPath] }
```

```javascript
import {foo as FooMacro} from './my.macro'

// no usage...

// references: {}
```

</details>

From here, it's just a matter of doing doing stuff with the `BabelPath`s that
you're given. For that check out [the babel handbook][babel-handbook].

> One other thing to note is that after your macro has run, babel-plugin-macros
> will remove the import/require statement for you.

#### source

This is a string used as import declaration's source - i.e. `'./my.macro'`.

#### config

There is a feature that allows users to configure your macro.

To specify that your plugin is configurable, you pass a `configName` to
`createMacro`.

A configuration is created from data combined from two sources: We use
[`cosmiconfig`][cosmiconfig] to read a `babel-plugin-macros` configuration which
can be located in any of the following files up the directories from the
importing file:

- `.babel-plugin-macrosrc`
- `.babel-plugin-macrosrc.json`
- `.babel-plugin-macrosrc.yaml`
- `.babel-plugin-macrosrc.yml`
- `.babel-plugin-macrosrc.js`
- `babel-plugin-macros.config.js`
- `babelMacros` in `package.json`

The content of the config will be merged with the content of the babel macros
plugin options. Config options take priority.

All together specifying and using the config might look like this:

```javascript
// .babel-plugin-macros.config.js
module.exports = {
  taggedTranslations: {locale: 'en_US'},
}

// .babel.config.js
module.exports = {
  plugins: [
    [
      "macros",
      {
        taggedTranslations: { locale: "en_GB" },
      },
    ],
  ],
};


// taggedTranslations.macro.js
const {createMacro} = require('babel-plugin-macros')
module.exports = createMacro(taggedTranslationsMacro, {
  configName: 'taggedTranslations',
})
function taggedTranslationsMacro({references, state, babel, config}) {
  const {locale = 'en'} = config
}
```

Note that in the above example if both files were specified, the final locale
value would be `en_US`, since that is the value in the plugin config file.

### Keeping imports

As said before, `babel-plugin-macros` automatically removes an import statement
of macro. If you want to keep it because you have other plugins processing
macros, return `{ keepImports: true }` from your macro:

```javascript
const {createMacro} = require('babel-plugin-macros')

module.exports = createMacro(taggedTranslationsMacro)

function taggedTranslationsMacro({references, state, babel}) {
  // process node from references

  return {
    keepImports: true,
  }
}
```

## Throwing Helpful Errors

Debugging stuff that transpiles your code is the worst, especially for
beginners. That's why it's important that you make assertions, and catch errors
to throw more meaningful errors with helpful information for the developer to
know what to do to resolve the issue.

In an effort to make this easier for you, `babel-plugin-macros` will wrap the
invocation of your plugin in a `try/catch` and throw as helpful an error message
as possible for you.

To make it even better, you can throw your own with more context. For example:

```javascript
const {createMacro, MacroError} = require('babel-plugin-macros')

module.exports = createMacro(myMacro)

function myMacro({references, state, babel}) {
  // something unexpected happens:
  throw new MacroError(
    'Some helpful and contextual message. Learn more: ' +
      'https://github.com/your-org/your-repo/blob/master/docs/errors.md#learn-more-about-eror-title',
  )
}
```

## Testing your macro

The best way to test your macro is using [`babel-plugin-tester`][tester]:

```javascript
import pluginTester from 'babel-plugin-tester'
import plugin from 'babel-plugin-macros'

pluginTester({
  plugin,
  snapshot: true,
  babelOptions: {filename: __filename},
  tests: [
    `
      import MyMacro from '../my.macro'

      MyMacro({someOption: true}, \`
        some stuff
      \`)
    `,
  ],
})
```

There is currently no way to get code coverage for your macro this way however.
If you want code coverage, you'll have to call your macro yourself.
Contributions to improve this experience are definitely welcome!

## Async logic

Unfortunately, babel plugins are synchronous so you can't do anything
asynchronous with `babel-plugin-macros`. However, you can cheat a bit by running
`child_process`'s `spawnSync` to synchronously execute a file. It's definitely a
hack and is not great for performance, but in most cases it's fast enough™️.

Luckily, [@Zemnmez](https://github.com/Zemnmez) created
[`do-sync`](https://github.com/Zemnmez/do-sync) which makes doing this much more
straightforward:

```javascript
const {doSync} = require('do-sync')
const {createMacro, MacroError} = require('babel-plugin-macros')

module.exports = createMacro(myMacro)

const getTheFlowers = doSync(async (arg1, arg2) => {
  const dep = require('some-dependency')
  const flowers = await dep(arg1, arg2.stuff)
  return flowers
})

function myMacro({references, state, babel}) {
  const flowers = getTheFlowers('...', {stuff: '...'})
  // ... more sync stuff
}
```

[preval]: https://github.com/kentcdodds/babel-plugin-preval
[babel-handbook]:
  https://github.com/thejameskyle/babel-handbook/blob/master/translations/en/plugin-handbook.md
[tester]: https://github.com/babel-utils/babel-plugin-tester
[keyword]: https://docs.npmjs.com/files/package.json#keywords
[npm-babel-plugin-macros]:
  https://www.npmjs.com/browse/keyword/babel-plugin-macros
[cosmiconfig]: https://www.npmjs.com/package/cosmiconfig
