/*
  This macro replaces a namespace import with multiple deep imports for each namespace member used

  import * as foo from './fixtures/namespace.macro'

  export const x = foo.bar(42)
  export const y = foo.baz(42)

        ↓ ↓ ↓ ↓ ↓ ↓

  import _baz from "some-module/dist/baz";
  import _bar from "some-module/dist/bar";
  export const x = _bar(42);
  export const y = _baz(42);
 */

const {createMacro} = require('../../')

module.exports = createMacro(namespaceProxyMacro)

function namespaceProxyMacro({references, babel}) {
  const {types} = babel

  forEach(references, (referenceInstances, referenceName) => {
    if (referenceName !== 'default') {
      throw new TypeError(`Named imports are not implemented.`)
    }
    forEach(referenceInstances, reference => {
      if (
        types.isTSQualifiedName(reference.parentPath) ||
        types.isQualifiedTypeIdentifier(reference.parentPath)
      ) {
        return
      }

      if (
        !types.isIdentifier(reference) ||
        !types.isMemberExpression(reference.parentPath)
      ) {
        throw new TypeError(
          `Unexpected context:\n reference type: ${
            reference.type
          } parent type: ${reference.parentPath.type} `,
        )
      }

      replaceReference(
        reference,
        types,
        types.Identifier,
        id => `some-module/dist/${id}`,
      )
    })
  })
}

function forEach(collection, iterator) {
  if (!collection) {
    return
  }
  if (Array.isArray(collection)) {
    collection.forEach(iterator)
  } else {
    Object.keys(collection).forEach(key =>
      iterator(collection[key], key, collection),
    )
  }
}

function replaceReference(reference, types, replacementType, proxy) {
  const name = reference.container.property.name
  const id = insertImport(reference, types, name, proxy)
  reference.parentPath.replaceWith(replacementType(id))
  return id
}

function insertImport(reference, types, name, proxy) {
  const {scope} = reference.findParent(path => path.type === 'Program')
  const identifier = scope.generateUidIdentifier(name)
  const ast = types.importDeclaration(
    [types.importDefaultSpecifier(identifier)],
    types.stringLiteral(proxy(name)),
  )
  scope.block.body.unshift(ast)
  return identifier.name
}
