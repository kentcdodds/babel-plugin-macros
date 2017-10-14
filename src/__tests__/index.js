import path from 'path'
import cpy from 'cpy'
import babel from 'babel-core'
import pluginTester from 'babel-plugin-tester'
import plugin from '../'

const projectRoot = path.join(__dirname, '../../')

beforeAll(() => {
  // copy our mock modules to the node_modules directory
  // so we can test how things work when importing a macro
  // from the node_modules directory.
  return cpy(['**/*.js'], path.join('..', '..', 'node_modules'), {
    parents: true,
    cwd: path.join(projectRoot, 'other', 'mock-modules'),
  })
})

afterEach(() => {
  // eslint-disable-next-line
  require('babel-macros-test-fake/macro').innerFn.mockClear()
})

expect.addSnapshotSerializer({
  print(val) {
    return val
      .split(projectRoot)
      .join('<PROJECT_ROOT>/')
      .replace(/\\/g, '/')
  },
  test(val) {
    return typeof val === 'string'
  },
})

pluginTester({
  plugin,
  snapshot: true,
  babelOptions: {filename: __filename, parserOpts: {plugins: ['jsx']}},
  tests: [
    {
      title: 'does nothing to code that does not import macro',
      snapshot: false,
      code: `
        import foo from './some-file-without-macro';
        const bar = require('./some-other-file-without-macro');
      `,
    },
    {
      title: 'does nothing but remove macros if it is unused',
      code: `
        import foo from './some-macros-that-doesnt-even-need-to-exist.macro'
        export default 'something else'
      `,
    },
    {
      title: 'works with import',
      code: `
        import myEval from './fixtures/eval.macro'
        const x = myEval\`34 + 45\`
      `,
    },
    {
      title: 'works with require',
      code: `
        const evaler = require('./fixtures/eval.macro')
        const x = evaler\`34 + 45\`
      `,
    },
    {
      title: 'works with function calls',
      code: `
        import myEval from './fixtures/eval.macro'
        const x = myEval('34 + 45')
      `,
    },
    {
      title: 'Works as a JSXElement',
      code: `
        import MyEval from './fixtures/eval.macro'
        const x = <MyEval>34 + 45</MyEval>
      `,
    },
    {
      title: 'Supports named imports',
      code: `
        import {css as CSS, styled as STYLED} from './fixtures/emotion.macro'
        const red = CSS\`
          background-color: red;
        \`

        const Div = STYLED.div\`
          composes: \${red}
          color: blue;
        \`
      `,
    },
    {
      title: 'supports macros from node_modules',
      code: `
        import fakeMacro from 'babel-macros-test-fake/macro'
        fakeMacro('hi')
      `,
      teardown() {
        // kinda abusing the babel-plugin-tester API here
        // to make an extra assertion
        // eslint-disable-next-line
        const fakeMacro = require('babel-macros-test-fake/macro')
        expect(fakeMacro.innerFn).toHaveBeenCalledTimes(1)
        expect(fakeMacro.innerFn).toHaveBeenCalledWith({
          references: expect.any(Object),
          state: expect.any(Object),
          babel: expect.any(Object),
          isBabelMacrosCall: true,
        })
        expect(fakeMacro.innerFn.mock.calls[0].babel).toBe(babel)
      },
    },
    {
      title: 'throws an error if the macro is not properly wrapped',
      error: true,
      code: `
        import unwrapped from './fixtures/non-wrapped.macro'
        unwrapped('hey')
      `,
    },
    {
      title: 'forwards MacroErrors thrown by the macro',
      error: true,
      code: `
        import errorThrower from './fixtures/macro-error-thrower.macro'
        errorThrower('hey')
      `,
    },
    {
      title: 'prepends the relative path for errors thrown by the macro',
      error: true,
      code: `
        import errorThrower from './fixtures/error-thrower.macro'
        errorThrower('hey')
      `,
    },
    {
      title: 'appends the npm URL for errors thrown by node modules',
      error: true,
      code: `
        import errorThrower from 'babel-macros-test-error-thrower.macro'
        errorThrower('hi')
      `,
    },
    {
      title:
        'appends the npm URL for errors thrown by node modules with a slash',
      error: true,
      code: `
        import errorThrower from 'babel-macros-test-error-thrower/macro'
        errorThrower('hi')
      `,
    },
  ],
})

test('throws error if it is not transpiled', () => {
  const untranspiledMacro = plugin.createMacro(() => {})
  expect(() =>
    untranspiledMacro({source: 'untranspiled.macro'}),
  ).toThrowErrorMatchingSnapshot()
})
