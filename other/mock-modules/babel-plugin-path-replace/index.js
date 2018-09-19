const types = require('@babel/types')

const problematicVisitor = {
  VariableDeclarator: {
    enter(path) {
      const initPath = path.get('init')

      initPath.replaceWith(
        types.sequenceExpression([
          types.stringLiteral('foobar'),
          initPath.node,
        ]),
      )
    },
  },
}

module.exports = () => ({
  visitor: {
    Program: {
      enter(path) {
        path.traverse(problematicVisitor)
      },
    },
  },
})
