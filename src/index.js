const p = require('path')
// const printAST = require('ast-pretty-print')

module.exports = macrosPlugin

function macrosPlugin() {
  return {
    name: 'macros',
    visitor: {
      ImportDeclaration(path, {file: {opts: {filename}}}) {
        const isMacros = looksLike(path, {
          node: {
            source: {
              value: v => v.endsWith('.macros'),
            },
          },
        })
        if (!isMacros) {
          return
        }
        const name = path.node.specifiers[0].local.name
        const referencePaths = path.scope.getBinding(name).referencePaths
        if (referencePaths && referencePaths.length) {
          const requirePath = p.join(
            p.dirname(filename),
            path.node.source.value,
          )
          // eslint-disable-next-line import/no-dynamic-require
          const macros = require(requirePath)
          referencePaths.forEach(ref => {
            macros(ref.parentPath.get('quasi'))
          })
        }
        path.remove()
      },
    },
  }
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
