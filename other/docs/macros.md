# macros

`babel-plugin-macros` is only as useful as the `macros` you add to your project.
You can make local macros for your project (`import a from './a.macro'`), but
there's an ecosystem of existing macros out there that you might find interesting:

* [`preval.macro`](https://www.npmjs.com/package/preval.macro): Pre-evaluate code at build-time
* [`codegen.macro`](https://www.npmjs.com/package/codegen.macro): 💥 Generate code at build-time
* [`import-all.macro`](https://www.npmjs.com/package/import-all.macro): A babel-macro that allows you to import all files that match a glob
* [`tagged-translations`](https://www.npmjs.com/package/tagged-translations): A dead simple babel-plugin for translating texts in React applications.
* [`traph.macro`](https://www.npmjs.com/package/traph.macro): JS Babel macro for Object transformation graph
* [`param.macro`](https://www.npmjs.com/package/param.macro): Partial application syntax and lambda parameters for JavaScript, inspired by Scala's `_` & Kotlin's it.
* [`ms.macro`](https://www.npmjs.com/package/ms.macro): Convert various time formats to milliseconds at build time in Babel.
* [`react-emotion/macro`](https://github.com/emotion-js/emotion/tree/78fea2d2eb74269645b28fe12392ecc09882f55f/packages/babel-plugin-emotion#babel-macros): Babel plugin for the minification and optimization of emotion styles.
* [`scope.macro`](https://www.npmjs.com/package/scope.macro): Adds useful build time console functions
* [`graphql.macro`](https://github.com/evenchange4/graphql.macro): Compile GraphQL AST at build-time with babel-plugin-macros.
* [`svgr.macro`](https://github.com/evenchange4/svgr.macro): Run svgr at build-time with babel-plugin-macros.
* [`glamorous.macro`](https://github.com/kentcdodds/glamorous.macro): Give your glamorous components a nice `displayName` for React DevTools.
* [`raw.macro`](https://github.com/pveyes/raw.macro): Webpack raw-loader implemented with babel-plugin-macros.
* [`penv.macro`](https://github.com/chengjianhua/penv.macro): Pick specified value or branch according to the environment of building.
* [`lqip.macro`](https://github.com/stereobooster/lqip.macro): Cretes LQIP at build time, similar to webpack lqip-loader.
* [`dev-console.macro`](https://www.npmjs.com/package/dev-console.macro): Remove all console.log, console.warn and console.error calls from production builds.
* [`data-uri.macro`](https://github.com/Andarist/data-uri.macro): Convert your assets to [data URIs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs) at build time.
* [`css-to-rn.macro`](https://github.com/jhen0409/css-to-rn.macro): Convert CSS to React Native style sheet at build time.
* [`regexgen.macro`](https://github.com/Andarist/regexgen.macro): Convert your set of strings to optimized RegExps at build time.
* [`tinker.macro`](https://github.com/bradlc/tinker.macro): Evaluate Laravel code at build time.
* [`@lingui/macro`](https://lingui.js.org/ref/macro.html): Macros for internationalization (i18n) in [LinguiJS](https://github.com/lingui/js-lingui/).
* [`unique-classname.macro`](https://github.com/huchenme/unique-classname.macro): Macro to generate unique className for Emotion.
* [`idx.macro`](https://github.com/dralletje/idx.macro): A utility function for traversing properties on objects and arrays.
* [`pipeline.macro`](https://github.com/Andarist/pipeline.macro): A babel macro which works similarly to the pipeline operator.

Please note that macros are intended to be used as devDependencies.

In addition, you can
[search npm for `keyword:babel-plugin-macros`](https://www.npmjs.com/search?q=keywords:babel-plugin-macros)
to find macros.
