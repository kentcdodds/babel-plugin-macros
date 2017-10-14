// const printAST = require('ast-pretty-print')
const {createMacro} = require('../../src')

module.exports = createMacro(evalMacro)

function evalMacro() {
  throw new Error('not helpful')
}
