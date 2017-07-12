const p = require('path')
// const printAST = require('ast-pretty-print')

const macrosRegex = /[./]macro(\.js)?$/

module.exports = macrosPlugin

function macrosPlugin() {
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
        applyMacros({path, imports, source, state})
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
        })
        path.parentPath.remove()
      },
    },
  }
}

function applyMacros({path, imports, source, state}) {
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
  const requirePath = p.join(p.dirname(filename), source)
  // eslint-disable-next-line import/no-dynamic-require
  const macros = require(requirePath)
  macros({
    references: referencePathsByImportName,
    state,
  })
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
  return val == null || /^[sbn]/.test(typeof val);
}
