const p = require('path')
// const printAST = require('ast-pretty-print')

const macrosRegex = /[./]macro(\.js)?$/

module.exports = macrosPlugin
module.exports.createMacro = createMacro

function createMacro(macro) {
  return macroWrapper

  function macroWrapper(options) {
    const {source, isBabelMacrosCall} = options
    if (!isBabelMacrosCall) {
      throw new Error(
        `The macro you imported from "${source}" is being executed outside the context of compilation with babel-macros. ` +
          `This indicates that you don't have the babel plugin "babel-macros" configured correctly. ` +
          `Please see the documentation for how to configure babel-macros properly: ` +
          'https://github.com/kentcdodds/babel-macros/blob/master/other/docs/user.md',
      )
    }
    return macro(options)
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
        const name = path.parent.id.name
        const source = path.node.arguments[0].value
        applyMacros({
          path,
          imports: [{localName: name, importedName: 'default'}],
          source,
          state,
          babel,
        })
        path.parentPath.remove()
      },
    },
  }
}

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
  const macros = require(requirePath)
  macros({
    references: referencePathsByImportName,
    state,
    babel,
    isBabelMacrosCall: true,
  })
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
