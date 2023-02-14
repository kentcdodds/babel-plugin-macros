import {createMacro} from '../../'

export default createMacro(function keepImportMacro() {
  return {keepImports: true}
})
