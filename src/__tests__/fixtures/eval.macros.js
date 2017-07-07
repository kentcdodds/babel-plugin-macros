const babylon = require('babylon')
// const printAST = require('ast-pretty-print')

module.exports = {
  asTag,
  asFunction,
  asJSX,
}

function asTag(quasiPath) {
  const value = quasiPath.parentPath.get('quasi').evaluate().value
  quasiPath.parentPath.replaceWith(evalToAST(value))
}

function asFunction(argumentsPaths) {
  const value = argumentsPaths[0].evaluate().value
  argumentsPaths[0].parentPath.replaceWith(evalToAST(value))
}

// eslint-disable-next-line no-unused-vars
function asJSX({attributes, children}) {
  // It's a shame you cannot use evaluate() with JSX
  const value = children[0].node.value
  children[0].parentPath.replaceWith(evalToAST(value))
}

function evalToAST(value) {
  let x
  // eslint-disable-next-line
  eval(`x = ${value}`);
  return thingToAST(x)
}

function thingToAST(object) {
  const fileNode = babylon.parse(`var x = ${JSON.stringify(object)}`)
  return fileNode.program.body[0].declarations[0].init
}
