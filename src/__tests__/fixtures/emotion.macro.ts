// this is a fake version of emotion
// const printAST = require('ast-pretty-print')
import {createMacro} from '../../'

module.exports = createMacro(emotionMacro)

function emotionMacro({references, babel}) {
  const {types: t} = babel
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
      const replacement = t.templateLiteral(
        [t.templateElement({raw: val, cooked: val})],
        [],
      )
      quasi.replaceWith(replacement)
    }
  })
}
