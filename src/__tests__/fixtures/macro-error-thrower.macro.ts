// const printAST = require('ast-pretty-print')
import {createMacro, MacroError} from '../../'

export default createMacro(function evalMacro() {
  throw new MacroError('very helpful')
})
