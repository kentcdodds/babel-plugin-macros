const p = require('path')
const resolve = require('resolve')
// const printAST = require('ast-pretty-print')

const macrosRegex = /[./]macro(\.js)?$/

// https://stackoverflow.com/a/32749533/971592
class MacroError extends Error {
  constructor(message) {
    super(message)
    this.name = 'MacroError'
    /* istanbul ignore else */
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else if (!this.stack) {
      this.stack = new Error(message).stack
    }
  }
}

function createMacro(macro, options = {}) {
  if (options.configName === 'options') {
    throw new Error(
      `You cannot use the configName "options". It is reserved for babel-plugin-macros.`,
    )
  }
  macroWrapper.isBabelMacro = true
  macroWrapper.options = options
  return macroWrapper

  function macroWrapper(args) {
    const {source, isBabelMacrosCall} = args
    if (!isBabelMacrosCall) {
      throw new MacroError(
        `The macro you imported from "${source}" is being executed outside the context of compilation with babel-plugin-macros. ` +
          `This indicates that you don't have the babel plugin "babel-plugin-macros" configured correctly. ` +
          `Please see the documentation for how to configure babel-plugin-macros properly: ` +
          'https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/user.md',
      )
    }
    return macro(args)
  }
}

function macrosPlugin(babel, {require: _require = require} = {}) {
  function interopRequire(path) {
    // eslint-disable-next-line import/no-dynamic-require
    const o = _require(path)
    return o && o.__esModule && o.default ? o.default : o
  }

  return {
    name: 'macros',
    visitor: {
      Program(progPath, state) {
        progPath.traverse({
          ImportDeclaration(path) {
            const isMacros = looksLike(path, {
              node: {
                source: {
                  value: v => macrosRegex.test(v),
                },
              },
            })
            if (!isMacros) {
              return
            }
            const imports = path.node.specifiers.map(s => ({
              localName: s.local.name,
              importedName:
                s.type === 'ImportDefaultSpecifier'
                  ? 'default'
                  : s.imported.name,
            }))
            const source = path.node.source.value
            const result = applyMacros({
              path,
              imports,
              source,
              state,
              babel,
              interopRequire,
            })

            if (!result || !result.keepImports) {
              path.remove()
            }
          },
          VariableDeclaration(path) {
            const isMacros = child =>
              looksLike(child, {
                node: {
                  init: {
                    callee: {
                      type: 'Identifier',
                      name: 'require',
                    },
                    arguments: args =>
                      args.length === 1 && macrosRegex.test(args[0].value),
                  },
                },
              })

            path
              .get('declarations')
              .filter(isMacros)
              .forEach(child => {
                const imports = child.node.id.name
                  ? [{localName: child.node.id.name, importedName: 'default'}]
                  : child.node.id.properties.map(property => ({
                      localName: property.value.name,
                      importedName: property.key.name,
                    }))

                const call = child.get('init')
                const source = call.node.arguments[0].value
                const result = applyMacros({
                  path: call,
                  imports,
                  source,
                  state,
                  babel,
                  interopRequire,
                })

                if (!result || !result.keepImports) {
                  child.remove()
                }
              })
          },
        })
      },
    },
  }
}

// eslint-disable-next-line complexity
function applyMacros({path, imports, source, state, babel, interopRequire}) {
  /* istanbul ignore next (pretty much only useful for astexplorer I think) */
  const {
    file: {
      opts: {filename = ''},
    },
  } = state
  let hasReferences = false
  const referencePathsByImportName = imports.reduce(
    (byName, {importedName, localName}) => {
      const binding = path.scope.getBinding(localName)

      byName[importedName] = binding.referencePaths
      hasReferences = hasReferences || Boolean(byName[importedName].length)

      return byName
    },
    {},
  )

  const isRelative = source.indexOf('.') === 0
  const requirePath = resolve.sync(source, {
    basedir: p.dirname(getFullFilename(filename)),
  })

  const macro = interopRequire(requirePath)
  if (!macro.isBabelMacro) {
    throw new Error(
      // eslint-disable-next-line prefer-template
      `The macro imported from "${source}" must be wrapped in "createMacro" ` +
        `which you can get from "babel-plugin-macros". ` +
        `Please refer to the documentation to see how to do this properly: https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md#writing-a-macro`,
    )
  }
  const config = getConfig(macro, filename, source)

  let result
  try {
    /**
     * Other plugins that run before babel-plugin-macros might use path.replace, where a path is
     * put into its own replacement. Apparently babel does not update the scope after such
     * an operation. As a remedy, the whole scope is traversed again with an empty "Identifier"
     * visitor - this makes the problem go away.
     *
     * See: https://github.com/kentcdodds/import-all.macro/issues/7
     */
    state.file.scope.path.traverse({
      Identifier() {},
    })

    result = macro({
      references: referencePathsByImportName,
      source,
      state,
      babel,
      config,
      isBabelMacrosCall: true,
    })
  } catch (error) {
    if (error.name === 'MacroError') {
      throw error
    }
    error.message = `${source}: ${error.message}`
    if (!isRelative) {
      error.message = `${
        error.message
      } Learn more: https://www.npmjs.com/package/${source.replace(
        // remove everything after package name
        // @org/package/macro -> @org/package
        // package/macro      -> package
        /^((?:@[^/]+\/)?[^/]+).*/,
        '$1',
      )}`
    }
    throw error
  }
  return result
}

// eslint-disable-next-line consistent-return
function getConfig(macro, filename, source) {
  if (macro.options.configName) {
    try {
      // lazy-loading it here to avoid perf issues of loading it up front.
      // No I did not measure. Yes I'm a bad person.
      // FWIW, this thing told me that cosmiconfig is 227.1 kb of minified JS
      // so that's probably significant... https://bundlephobia.com/result?p=cosmiconfig@3.1.0
      // Note that cosmiconfig will cache the babel-plugin-macros config 👍
      const explorer = require('cosmiconfig')('babel-plugin-macros', {
        searchPlaces: [
          'package.json',
          `.babel-plugin-macrosrc`,
          `.babel-plugin-macrosrc.json`,
          `.babel-plugin-macrosrc.yaml`,
          `.babel-plugin-macrosrc.yml`,
          `.babel-plugin-macrosrc.js`,
          `babel-plugin-macros.config.js`,
        ],
        packageProp: 'babelMacros',
        sync: true,
      })
      const loaded = explorer.searchSync(filename)
      if (loaded) {
        return loaded.config[macro.options.configName]
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `There was an error trying to load the config "${
          macro.options.configName
        }" ` +
          `for the macro imported from "${source}. ` +
          `Please see the error thrown for more information.`,
      )
      throw error
    }
  }
}

/*
 istanbul ignore next
 because this is hard to test
 and not worth it...
 */
function getFullFilename(filename) {
  if (p.isAbsolute(filename)) {
    return filename
  }
  return p.join(process.cwd(), filename)
}

function looksLike(a, b) {
  return (
    a &&
    b &&
    Object.keys(b).every(bKey => {
      const bVal = b[bKey]
      const aVal = a[bKey]
      if (typeof bVal === 'function') {
        return bVal(aVal)
      }
      return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal)
    })
  )
}

function isPrimitive(val) {
  // eslint-disable-next-line
  return val == null || /^[sbn]/.test(typeof val)
}

module.exports = macrosPlugin
Object.assign(module.exports, {
  createMacro,
  MacroError,
})
