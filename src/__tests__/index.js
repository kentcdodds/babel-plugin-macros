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
      code: 'import foo from "./some-file-without-macros";',
    },
    {
      title: 'does nothing but remove macros if it is unused',
      code: `
        import foo from "./some-macros-that-doesnt-even-need-to-exist.macros"

        export default "something else"
      `,
    },
    `
      import myEval from './fixtures/eval.macros'

      const x = myEval\`34 + 45\`
    `,
  ]),
})

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
