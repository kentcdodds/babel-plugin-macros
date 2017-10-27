const p = require('path')
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
      `You cannot use the configName "options". It is reserved for babel-macros.`,
    )
  }
  macroWrapper.isBabelMacro = true
  macroWrapper.options = options
  return macroWrapper

  function macroWrapper(args) {
    const {source, isBabelMacrosCall} = args
    if (!isBabelMacrosCall) {
      throw new MacroError(
        `The macro you imported from "${source}" is being executed outside the context of compilation with babel-macros. ` +
          `This indicates that you don't have the babel plugin "babel-macros" configured correctly. ` +
          `Please see the documentation for how to configure babel-macros properly: ` +
          'https://github.com/kentcdodds/babel-macros/blob/master/other/docs/user.md',
      )
    }
    return macro(args)
  }
}

function macrosPlugin(babel) {
  return {
    name: 'macros',
    visitor: {
      ImportDeclaration(path, state) {
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
            s.type === 'ImportDefaultSpecifier' ? 'default' : s.imported.name,
        }))
        const source = path.node.source.value
        applyMacros({
          path,
          imports,
          source,
          state,
          babel,
        })
        path.remove()
      },
      CallExpression(path, state) {
        const isMacros = looksLike(path, {
          node: {
            callee: {
              type: 'Identifier',
              name: 'require',
            },
            arguments: args =>
              args.length === 1 && macrosRegex.test(args[0].value),
          },
          parent: {
            type: 'VariableDeclarator',
          },
        })
        if (!isMacros) {
          return
        }
        const imports = path.parent.id.name
          ? [{localName: path.parent.id.name, importedName: 'default'}]
          : path.parent.id.properties.map(property => ({
              localName: property.value.name,
              importedName: property.key.name,
            }))
        const source = path.node.arguments[0].value
        applyMacros({
          path,
          imports,
          source,
          state,
          babel,
        })
        path.parentPath.remove()
      },
    },
  }
}

// eslint-disable-next-line complexity
function applyMacros({path, imports, source, state, babel}) {
  const {file: {opts: {filename}}} = state
  let hasReferences = false
  const referencePathsByImportName = imports.reduce(
    (byName, {importedName, localName}) => {
      byName[importedName] = path.scope.getBinding(localName).referencePaths
      hasReferences = hasReferences || Boolean(byName[importedName].length)
      return byName
    },
    {},
  )
  if (!hasReferences) {
    return
  }
  let requirePath = source
  const isRelative = source.indexOf('.') === 0
  if (isRelative) {
    requirePath = p.join(p.dirname(getFullFilename(filename)), source)
  }
  // eslint-disable-next-line import/no-dynamic-require
  const macro = require(requirePath)
  if (!macro.isBabelMacro) {
    throw new Error(
      // eslint-disable-next-line prefer-template
      `The macro imported from "${source}" must be wrapped in "createMacro" ` +
        `which you can get from "babel-macros". ` +
        `Please refer to the documentation to see how to do this properly: https://github.com/kentcdodds/babel-macros/blob/master/other/docs/author.md#writing-a-macro`,
    )
  }
  const config = getConfig(macro, filename, source)
  try {
    macro({
      references: referencePathsByImportName,
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
      error.message = `${error.message} Learn more: https://www.npmjs.com/package/${source.replace(
        /(\/.*)/g,
        '',
      )}`
    }
    throw error
  }
}

// eslint-disable-next-line consistent-return
function getConfig(macro, filename, source) {
  if (macro.options.configName) {
    try {
      // lazy-loading it here to avoid perf issues of loading it up front.
      // No I did not measure. Yes I'm a bad person.
      // FWIW, this thing told me that cosmiconfig is 227.1 kb of minified JS
      // so that's probably significant... https://bundlephobia.com/result?p=cosmiconfig@3.1.0
      // Note that cosmiconfig will cache the babel-macros config 👍
      const loaded = require('cosmiconfig')('babel-macros', {
        packageProp: 'babelMacros',
        rc: '.babel-macrosrc',
        js: 'babel-macros.config.js',
        rcExtensions: true,
        sync: true,
      }).load(filename)
      if (loaded) {
        return loaded.config[macro.options.configName]
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `There was an error trying to load the config "${macro.options
          .configName}" ` +
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
