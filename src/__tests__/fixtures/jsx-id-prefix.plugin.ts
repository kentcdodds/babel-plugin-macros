// babel-plugin adding `plugin-` prefix to each "id" JSX attribute
import {NodePath} from '@babel/core'
import {BabelType} from 'babel-plugin-tester'

export default function main({types: t}: BabelType) {
  return {
    visitor: {
      // intentionally traversing from Program,
      // if it matches JSXAttribute here the issue won't be reproduced
      Program(progPath: NodePath) {
        progPath.traverse({
          JSXAttribute(path: NodePath) {
            const name = path.get('name')
            if (t.isJSXIdentifier(name) && name.name === 'id') { /// DANGER! CODE CHANGE!
              const value = path.get('value')
              if (Array.isArray(value)) {
                throw new Error("Value path is an array. Don't know how to handle this")
              }
              if (t.isStringLiteral(value))
                value.replaceWith(t.stringLiteral(`plugin-${value.value}`)) /// DANGER! CODE CHANGE!
            }
          },
        })
      },
    },
  }
}
