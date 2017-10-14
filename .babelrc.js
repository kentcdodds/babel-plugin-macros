const babelConfig = require('kcd-scripts/babel')

babelConfig.plugins = babelConfig.plugins.filter(
  pluginPath => !pluginPath.includes('babel-macros/dist/index.js'),
)
module.exports = babelConfig
