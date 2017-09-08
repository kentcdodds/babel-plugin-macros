// this is used to make sure that you can require macro from node_modules
const {createMacro} = require('../../src')

const innerFn = jest.fn()
module.exports = createMacro(innerFn)
module.exports.innerFn = innerFn
