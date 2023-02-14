// adds "prefix-" to each `id` attribute
import {createMacro} from '../../'
import {
  JSXElement,
  JSXExpressionContainer,
  JSXFragment,
  StringLiteral,
} from '@babel/types'

module.exports = createMacro(function wrapWidget({references, babel}) {
  const {types: t} = babel
  references.default.forEach(wrap => {
    wrap.parentPath?.traverse({
      JSXAttribute(path) {
        const name = path.get('name')
        if (t.isJSXIdentifier(name) && name.node.name === 'id') {
          const value = path.get('value')
          if (isStringLiteral(value.node)) {
            value.replaceWith(t.stringLiteral(`macro-${value.node?.value}`))
          }
        }
      },
    })
  })
})

function isStringLiteral(
  node:
    | JSXElement
    | JSXExpressionContainer
    | JSXFragment
    | StringLiteral
    | null
    | undefined,
): node is StringLiteral {
  if (!node) return false
  return node.type === 'StringLiteral'
}
