import {parse} from '@babel/parser'
import {Node, NodePath} from '@babel/traverse'
import {Expression, Statement, VariableDeclaration} from '@babel/types'
// const printAST = require('ast-pretty-print')
import {createMacro} from '../../'

export default createMacro(function evalMacro({references, state}) {
  references.default.forEach(referencePath => {
    if (referencePath.parentPath?.type === 'TaggedTemplateExpression') {
      asTag(referencePath.parentPath?.get('quasi'))
    } else if (referencePath.parentPath?.type === 'CallExpression') {
      const args = referencePath.parentPath?.get('arguments')
      if (!Array.isArray(args)) {
        throw new Error('Was expecting array')
      }
      asFunction(args)
    } else if (referencePath.parentPath?.type === 'JSXOpeningElement') {
      asJSX({
        attributes: referencePath.parentPath?.get('attributes'),
        children: referencePath.parentPath?.parentPath?.get('children'),
      })
    } else {
      // TODO: throw a helpful error message
    }
  })
})

function asTag(quasiPath: NodePath | NodePath[]) {
  if (Array.isArray(quasiPath)) {
    throw new Error("Don't know how to handle arrays")
  }

  const parentQuasi = quasiPath.parentPath?.get('quasi')

  if (!parentQuasi) {
    throw new Error('No quasi path on parent')
  }

  if (Array.isArray(parentQuasi)) {
    throw new Error("Don't know how to handle arrays")
  }
  const value = parentQuasi.evaluate().value
  quasiPath.parentPath?.replaceWith(evalToAST(value))
}

function asFunction(argumentsPaths: NodePath[]) {
  const value = argumentsPaths[0].evaluate().value
  argumentsPaths[0].parentPath?.replaceWith(evalToAST(value))
}

type NodeWithValue = Node & {
  value: any
}

function isNodeWithValue(node: Node): node is NodeWithValue {
  return Object.prototype.hasOwnProperty.call(node, 'value')
}

// eslint-disable-next-line no-unused-vars
function asJSX({
  attributes,
  children,
}: {
  attributes: NodePath | NodePath[]
  children: NodePath | NodePath[] | undefined
}) {
  // It's a shame you cannot use evaluate() with JSX
  if (!Array.isArray(children)) {
    throw new Error("Don't know how to handle single children")
  }
  const firstChild = children[0]
  if (!isNodeWithValue(firstChild.node)) {
    throw new Error("Don't know to handle nodes without values")
  }
  const value = firstChild.node.value
  firstChild.parentPath?.replaceWith(evalToAST(value))
}

function evalToAST(value: Expression | null | undefined): Expression {
  let x: Record<string, unknown> = {}
  // eslint-disable-next-line
  eval(`x = ${value}`)
  return thingToAST(x)
}

function isVariableDeclaration(
  statement: Statement,
): statement is VariableDeclaration {
  return statement.type === 'VariableDeclaration'
}

function thingToAST(object: Record<string, unknown>) {
  const fileNode = parse(`var x = ${JSON.stringify(object)}`)
  const firstStatement = fileNode.program.body[0]

  if (!isVariableDeclaration(firstStatement)) {
    throw new Error('Only know how to handle VariableDeclarations')
  }

  const initDeclaration = firstStatement.declarations[0].init

  if (!initDeclaration) {
    throw new Error('Was expecting expression')
  }
  return initDeclaration
}
