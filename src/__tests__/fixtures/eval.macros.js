const babylon = require('babylon')
// const printAST = require('ast-pretty-print')

module.exports = evalMacros

function evalMacros(path) {
  const value = path.parentPath.get('quasi').evaluate().value
  let x
  // eslint-disable-next-line
  eval(`x = ${value}`);
  path.parentPath.replaceWith(thingToAST(x))
}

function thingToAST(object) {
  const fileNode = babylon.parse(`var x = ${JSON.stringify(object)}`)
  return fileNode.program.body[0].declarations[0].init
}
