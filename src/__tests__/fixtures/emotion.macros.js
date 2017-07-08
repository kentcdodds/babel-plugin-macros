const t = require('babel-types')
// this is a fake version of emotion
// const printAST = require('ast-pretty-print')

module.exports = function emotionMacros({references}) {
  references.css.forEach(cssRef => {
    if (cssRef.parentPath.type === 'TaggedTemplateExpression') {
      cssRef.parentPath.replaceWith(
        t.stringLiteral(cssRef.parentPath.get('quasi').evaluate().value.trim()),
      )
    }
  })
  references.styled.forEach(styledRef => {
    if (styledRef.parentPath.parentPath.type === 'TaggedTemplateExpression') {
      const quasi = styledRef.parentPath.parentPath.get('quasi')
      const val = quasi.evaluate().value.trim()
      const replacement = t.templateLiteral([t.templateElement(val)], [])
      quasi.replaceWith(replacement)
    }
  })
}
