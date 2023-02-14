// const printAST = require('ast-pretty-print')
import {createMacro} from '../../'

module.exports = createMacro(function evalMacro() {
  throw new Error('very unhelpful')
})
