// this is a fake version of emotion
// const printAST = require('ast-pretty-print')
import {createMacro} from '../../'

module.exports = createMacro(function emotionMacro({references, babel}) {
  const {types: t} = babel
  references.css.forEach(cssRef => {
    if (cssRef.parentPath?.type === 'TaggedTemplateExpression') {
      const path = cssRef.parentPath.get('quasi')
      if (Array.isArray(path)) {
        throw new Error("Don't know how to handle this situation")
      }
      const str = path.evaluate().value.trim()

      cssRef.parentPath.replaceWith(t.stringLiteral(str))
    }
  })
  references.styled.forEach(styledRef => {
    if (styledRef.parentPath?.parentPath?.type === 'TaggedTemplateExpression') {
      const quasi = styledRef.parentPath.parentPath.get('quasi')
      if (Array.isArray(quasi)) {
        throw new Error('Not expecting array')
      }
      const val = quasi.evaluate().value.trim()
      const replacement = t.templateLiteral(
        [t.templateElement({raw: val, cooked: val})],
        [],
      )
      quasi.replaceWith(replacement)
    }
  })
})
