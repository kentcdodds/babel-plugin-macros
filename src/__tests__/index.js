import path from 'path'
import pluginTester from 'babel-plugin-tester'
import plugin from '../'

const projectRoot = path.join(__dirname, '../../')

// we don't actually need this,
// but I found that it removes double escaping when I include it...
expect.addSnapshotSerializer({
  print(val) {
    return val.split(projectRoot).join('<PROJECT_ROOT>/')
  },
  test(val) {
    return typeof val === 'string'
  },
})

pluginTester({
  plugin,
  snapshot: true,
  tests: withFilename([
    {
      title: 'does nothing to code that does not import macros',
      snapshot: false,
      code: `
        import foo from './some-file-without-macros';
        const bar = require('./some-other-file-without-macros');
      `,
    },
    {
      title: 'does nothing but remove macros if it is unused',
      code: `
        import foo from "./some-macros-that-doesnt-even-need-to-exist.macros"
        export default "something else"
      `,
    },
    {
      title: 'works with import',
      code: `
        import myEval from './fixtures/eval.macros'
        const x = myEval\`34 + 45\`
      `,
    },
    {
      title: 'works with require',
      code: `
        const evaler = require('./fixtures/eval.macros')
        const x = evaler\`34 + 45\`
      `,
    },
    {
      title: 'works with function calls',
      code: `
        import myEval from './fixtures/eval.macros'
        const x = myEval('34 + 45')
      `,
    },
    {
      title: 'Works as a JSXElement',
      code: `
        import MyEval from './fixtures/eval.macros'
        const x = <MyEval>34 + 45</MyEval>
      `,
    },
    {
      title: 'Supports named imports',
      code: `
        import {css as CSS, styled as STYLED} from './fixtures/emotion.macros'
        const red = CSS\`
          background-color: red;
        \`

        const Div = STYLED.div\`
          composes: \${red}
          color: blue;
        \`
      `,
    },
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
      test.babelOptions.parserOpts = test.babelOptions.parserOpts || {}
    }
    Object.assign(test.babelOptions.parserOpts, {
      // add the jsx plugin to all tests because why not?
      plugins: ['jsx'],
    })
    return test
  })
}
