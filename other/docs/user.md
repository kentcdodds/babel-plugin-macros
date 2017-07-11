# `babel-macros` Usage for users

> See also: [the `author` docs](https://github.com/kentcdodds/babel-macros/blob/master/other/docs/author.md).

## Adding the plugin to your config

### Via `.babelrc` (Recommended)

**.babelrc**

```json
{
  "plugins": ["babel-macros"]
}
```

### Via CLI

```shell
babel --plugins babel-macros script.js
```

### Via Node API

```js
require('babel-core').transform('code', {
  plugins: ['babel-macros'],
})
```

## Using a macros

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
