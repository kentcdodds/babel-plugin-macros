import {createMacro} from '../../..'

// exports for testing purposes only
export const configName = 'configurableMacro'
export const realMacro = jest.fn()

export default createMacro(realMacro, ({configName} = {}))
