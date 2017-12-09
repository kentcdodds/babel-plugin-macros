# `babel-plugin-macros` Usage for users

> See also: [the `author` docs](https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md).

## Adding the plugin to your config

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["macros"]
}
```

### Via CLI

```shell
babel --plugins babel-plugin-macros script.js
```

### Via Node API

```js
require('babel-core').transform('code', {
  plugins: ['macros'],
})
```

## Using a macro

With the `babel-plugin-macros` plugin added to your config, we can now use a macro
that works with the `babel-plugin-macros` API. Let's assume we have such a module
in our project called `eval.macro.js`. To use it, we `import` or `require`
the macro module in our code like so:

```javascript
import MyEval from './eval.macro'
// or
const MyEval = require('./eval.macro')
```

Then we use that variable however the documentation for the macro says.
Incidentally, `eval.macro.js` actually exists in the tests for `babel-plugin-macros`
[here][eval-macro] and you can see how it transforms our code in
[the `babel-plugin-macros` snapshots][eval-snapshots].

> Note here that the real benefit is that we don't need to configure anything
> for every macro you add. We simply configure `babel-plugin-macros`, then we can
> use any macro available. This is part of the benefit of using `babel-plugin-macros`.

[eval-macro]: https://github.com/kentcdodds/babel-plugin-macros/blob/master/src/__tests__/fixtures/eval.macro.js
[eval-snapshots]: https://github.com/kentcdodds/babel-plugin-macros/blob/master/src/__tests__/__snapshots__/index.js.snap
