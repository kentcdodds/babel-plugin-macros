import p from 'path'
import resolve from 'resolve'
// const printAST = require('ast-pretty-print')
import type {cosmiconfigSync} from 'cosmiconfig'
import type {NodePath, Node} from '@babel/traverse'
import {
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  Identifier,
  StringLiteral,
  VariableDeclarator,
  isArrayPattern,
  isAssignmentPattern,
  isMemberExpression,
  isObjectPattern,
  isRestElement,
  isTSParameterProperty,
  isTSAsExpression,
  isTSNonNullExpression,
  isIdentifier,
  isTypeParameter,
  isJSXAttribute,
  isJSXClosingElement,
  isJSXIdentifier,
  isJSXNamespacedName,
  isJSXOpeningElement,
  isPlaceholder,
  isV8IntrinsicIdentifier,
  is,
  isTSTypeParameter,
  isObjectExpression,
  isObjectTypeAnnotation,
  Expression,
  CallExpression,
  PatternLike,
  PrivateName,
  ArgumentPlaceholder,
  JSXNamespacedName,
  SpreadElement,
  RecordExpression,
  ObjectTypeAnnotation,
  ObjectPattern,
  ObjectExpression,
  LVal,
  ImportDeclaration,
} from '@babel/types'

const macrosRegex = /[./]macro(\.c?js)?$/
const testMacrosRegex = (v: string) => macrosRegex.test(v)

// https://stackoverflow.com/a/32749533/971592
export class MacroError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MacroError'
    /* istanbul ignore else */
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor)
    } else if (!this.stack) {
      this.stack = new Error(message).stack
    }
  }
}

type MacroWrapperArgs = Record<string, unknown> & {
  source: string
  isBabelMacrosCall?: boolean
}

let _configExplorer: CosmicConfig

function getConfigExplorer() {
  return (_configExplorer = _configExplorer || loadCosmicConfig())
}

type CosmicConfig = ReturnType<typeof cosmiconfigSync>

function loadCosmicConfig(): CosmicConfig {
  // Lazy load cosmiconfig since it is a relatively large bundle
  const pkg = require('cosmiconfig')

  const sync: typeof cosmiconfigSync = pkg.cosmiconfigSync

  const out = sync('babel-plugin-macros', {
    searchPlaces: [
      'package.json',
      '.babel-plugin-macrosrc',
      '.babel-plugin-macrosrc.json',
      '.babel-plugin-macrosrc.yaml',
      '.babel-plugin-macrosrc.yml',
      '.babel-plugin-macrosrc.js',
      'babel-plugin-macros.config.js',
    ],
    packageProp: 'babelMacros',
  })

  return out
}

type CreateMacroOptions = {
  configName: string
}

export function createMacro(
  macro: (args: MacroWrapperArgs) => unknown,
  options: Partial<CreateMacroOptions> = {},
) {
  if (options.configName === 'options') {
    throw new Error(
      `You cannot use the configName "options". It is reserved for babel-plugin-macros.`,
    )
  }
  macroWrapper.isBabelMacro = true
  macroWrapper.options = options
  return macroWrapper

  function macroWrapper(args: MacroWrapperArgs) {
    const {source, isBabelMacrosCall} = args
    if (!isBabelMacrosCall) {
      throw new MacroError(
        `The macro you imported from "${source}" is being executed outside the context of compilation with babel-plugin-macros. ` +
          `This indicates that you don't have the babel plugin "babel-plugin-macros" configured correctly. ` +
          `Please see the documentation for how to configure babel-plugin-macros properly: ` +
          'https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/user.md',
      )
    }
    return macro(args)
  }
}

function nodeResolvePath(source: string, basedir: string) {
  return resolve.sync(source, {
    basedir,
    extensions: ['.js', '.ts', '.tsx', '.mjs', '.cjs', '.jsx'],
    // This is here to support the package being globally installed
    // read more: https://github.com/kentcdodds/babel-plugin-macros/pull/138
    paths: [p.resolve(__dirname, '../../')],
  })
}

type ProgramState = {
  file: {
    opts: {filename?: string}
    scope: {
      path: NodePath
    }
  }
}

type MacrosPluginOptions = {
  require?: NodeRequire
  resolvePath?(source: string, basedir: string): string
  isMacrosName?(v: string): boolean
}

export function macrosPlugin(
  babel: unknown,
  // istanbul doesn't like the default of an object for the plugin options
  // but I think older versions of babel didn't always pass options
  // istanbul ignore next
  {
    require: _require = require,
    resolvePath = nodeResolvePath,
    isMacrosName = testMacrosRegex,
    ...options
  }: MacrosPluginOptions = {},
) {
  function interopRequire(path: string) {
    // eslint-disable-next-line import/no-dynamic-require
    const o = _require(path)
    return o && o.__esModule && o.default ? o.default : o
  }

  return {
    name: 'macros',
    visitor: {
      Program(progPath: NodePath, state: ProgramState) {
        progPath.traverse({
          ImportDeclaration(path) {
            const isMacros = looksLike(path, {
              node: {
                source: {
                  value: (v: string) => isMacrosName(v),
                },
              },
            })
            if (!isMacros) {
              return
            }
            const imports = path.node.specifiers.map(s => {
              if (isImportDefaultSpecifier(s)) {
                return {
                  localName: s.local.name,
                  importedName: 'default',
                }
              } else if (isImportSpecifier(s)) {
                const identifier = s.imported
                if (isStringLiteral(s.imported)) {
                  throw new Error('Not sure what to do')
                }
                return {
                  localName: s.local.name,
                  importedName: s.imported.name,
                }
              } else {
                throw new Error('Not sure how to handle this situation')
              }
            })
            const source = path.node.source.value
            const result = applyMacros({
              path,
              imports,
              source,
              state,
              babel,
              interopRequire,
              resolvePath,
              options,
            })

            if (!result || !result.keepImports) {
              path.remove()
            }
          },
          VariableDeclaration(path) {
            const isMacros = (child: NodePath<VariableDeclarator>) =>
              looksLike(child, {
                node: {
                  init: {
                    callee: {
                      type: 'Identifier',
                      name: 'require',
                    },
                    arguments: (args: {value: string}[]) =>
                      args.length === 1 && isMacrosName(args[0].value),
                  },
                },
              })

            path
              .get('declarations')
              .filter(isMacros)
              .forEach(child => {
                const imports = getImports(child)

                const call = child.get('init')

                if (
                  !call.isCallExpression() &&
                  !call.isNewExpression() &&
                  !call.isOptionalCallExpression()
                ) {
                  throw new Error('Expecting arguments')
                }

                const node = call.node

                const firstArgument = node.arguments[0]

                if (!isExpressionWithValue(firstArgument)) {
                  throw new Error(
                    "Don't know how to get source of expression without value",
                  )
                }

                const source = firstArgument.value
                const result = applyMacros({
                  path: call,
                  imports,
                  source,
                  state,
                  babel,
                  interopRequire,
                  resolvePath,
                  options,
                })

                if (!result || !result.keepImports) {
                  child.remove()
                }
              })
          },
        })
      },
    },
  }
}

type ExpressionWithValue = Expression & {
  value: string
}

function isExpressionWithValue(
  expression:
    | ArgumentPlaceholder
    | JSXNamespacedName
    | SpreadElement
    | Expression,
): expression is ExpressionWithValue {
  return Object.prototype.hasOwnProperty.call(expression, 'value')
}

type Import = {
  importedName: string
  localName: string
}

function getImports(child: NodePath<VariableDeclarator>): Import | Import[] {
  const id = child.node.id

  if (isIdentifier(id) && id.name) {
    return [{localName: id.name, importedName: 'default'}]
  } else if (isObjectPattern(id)) {
    return id.properties.map(property => {
      if (isRestElement(property)) {
        throw new Error("Don't know how to handle this")
      }

      const {key, value} = property

      if (!isExpressionWithName(key)) {
        throw new Error('Key is not named')
      }

      if (!isExpressionWithName(value)) {
        throw new Error('Value is not named')
      }

      return {
        importedName: key.name,
        localName: value.name,
      }
    })
  } else {
    throw new Error('Not sure how to handle this')
  }
}

type ExpressionWithName = Expression & {
  name: any
}

function isExpressionWithName(
  expression: Expression | PatternLike | PrivateName,
): expression is ExpressionWithName {
  return Object.hasOwnProperty.call(expression, 'name')
}

function isImportDefaultSpecifier(
  specifier:
    | ImportDefaultSpecifier
    | ImportNamespaceSpecifier
    | ImportSpecifier,
): specifier is ImportDefaultSpecifier {
  return specifier.type === 'ImportDefaultSpecifier'
}

function isImportSpecifier(
  specifier:
    | ImportDefaultSpecifier
    | ImportNamespaceSpecifier
    | ImportSpecifier,
): specifier is ImportSpecifier {
  return specifier.type === 'ImportSpecifier'
}

function isStringLiteral(
  node: Identifier | StringLiteral,
): node is StringLiteral {
  return node.type === 'StringLiteral'
}

type MacroRequireFunctionOptions = {
  references: Record<string, NodePath<Node>[]>
  source: string
  state: ProgramState
  babel: unknown
  config: unknown
  isBabelMacrosCall: true
}

type InteropRequireFunction = ((
  arg: MacroRequireFunctionOptions,
) => ApplyMacrosResult) & {isBabelMacro: boolean}

type ApplyMacrosOptions = {
  path: NodePath
  imports: Import | Import[] | undefined
  source: string
  state: ProgramState
  babel: unknown
  interopRequire(path: string): InteropRequireFunction
  resolvePath(source: string, basedir: string): string
  options: {}
}

type ApplyMacrosResult =
  | {
      keepImports: boolean
    }
  | undefined

// eslint-disable-next-line complexity
function applyMacros({
  path,
  imports,
  source,
  state,
  babel,
  interopRequire,
  resolvePath,
  options,
}: ApplyMacrosOptions): ApplyMacrosResult {
  if (!imports) {
    throw new Error('no imports to reduce')
  }

  const importArray = Array.isArray(imports) ? imports : [imports]

  /* istanbul ignore next (pretty much only useful for astexplorer I think) */
  const {
    file: {
      opts: {filename = ''},
    },
  } = state

  let hasReferences = false
  const referencePathsByImportName = importArray.reduce(
    (byName, {importedName, localName}) => {
      const binding = path.scope.getBinding(localName)

      if (!binding) return byName

      byName[importedName] = binding.referencePaths
      hasReferences = hasReferences || Boolean(byName[importedName].length)

      return byName
    },
    {} as Record<string, NodePath<Node>[]>,
  )

  const isRelative = source.indexOf('.') === 0
  const requirePath = resolvePath(source, p.dirname(getFullFilename(filename)))

  const macro = interopRequire(requirePath)
  if (!macro.isBabelMacro) {
    throw new Error(
      `The macro imported from "${source}" must be wrapped in "createMacro" ` +
        `which you can get from "babel-plugin-macros". ` +
        `Please refer to the documentation to see how to do this properly: https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md#writing-a-macro`,
    )
  }
  const config = getConfig(macro, filename, source, options)

  let result
  try {
    /**
     * Other plugins that run before babel-plugin-macros might use path.replace, where a path is
     * put into its own replacement. Apparently babel does not update the scope after such
     * an operation. As a remedy, the whole scope is traversed again with an empty "Identifier"
     * visitor - this makes the problem go away.
     *
     * See: https://github.com/kentcdodds/import-all.macro/issues/7
     */
    state.file.scope.path.traverse({
      Identifier() {},
    })

    result = macro({
      references: referencePathsByImportName,
      source,
      state,
      babel,
      config,
      isBabelMacrosCall: true,
    })
  } catch (err) {
    const error = err as Error

    if (error.name === 'MacroError') {
      throw error
    }
    error.message = `${source}: ${error.message}`
    if (!isRelative) {
      error.message = `${
        error.message
      } Learn more: https://www.npmjs.com/package/${source.replace(
        // remove everything after package name
        // @org/package/macro -> @org/package
        // package/macro      -> package
        /^((?:@[^/]+\/)?[^/]+).*/,
        '$1',
      )}`
    }
    throw error
  }
  return result
}

function getConfigFromFile(configName, filename) {
  try {
    const loaded = getConfigExplorer().search(filename)

    if (loaded) {
      return {
        options: loaded.config[configName],
        path: loaded.filepath,
      }
    }
  } catch (e) {
    return {error: e}
  }
  return {}
}

function getConfigFromOptions(configName, options) {
  if (options.hasOwnProperty(configName)) {
    if (options[configName] && typeof options[configName] !== 'object') {
      // eslint-disable-next-line no-console
      console.error(
        `The macro plugin options' ${configName} property was not an object or null.`,
      )
    } else {
      return {options: options[configName]}
    }
  }
  return {}
}

function getConfig(macro, filename, source, options) {
  const {configName} = macro.options
  if (configName) {
    const fileConfig = getConfigFromFile(configName, filename)
    const optionsConfig = getConfigFromOptions(configName, options)

    if (
      optionsConfig.options === undefined &&
      fileConfig.options === undefined &&
      fileConfig.error !== undefined
    ) {
      // eslint-disable-next-line no-console
      console.error(
        `There was an error trying to load the config "${configName}" ` +
          `for the macro imported from "${source}. ` +
          `Please see the error thrown for more information.`,
      )
      throw fileConfig.error
    }

    if (
      fileConfig.options !== undefined &&
      optionsConfig.options !== undefined &&
      typeof fileConfig.options !== 'object'
    ) {
      throw new Error(
        `${fileConfig.path} specified a ${configName} config of type ` +
          `${typeof optionsConfig.options}, but the the macros plugin's ` +
          `options.${configName} did contain an object. Both configs must ` +
          `contain objects for their options to be mergeable.`,
      )
    }

    return {
      ...optionsConfig.options,
      ...fileConfig.options,
    }
  }
  return undefined
}

/*
 istanbul ignore next
 because this is hard to test
 and not worth it...
 */
function getFullFilename(filename: string) {
  if (p.isAbsolute(filename)) {
    return filename
  }
  return p.join(process.cwd(), filename)
}

type Val = Record<string, unknown>
function looksLike(a: Val, b: Val): boolean {
  return (
    a &&
    b &&
    Object.keys(b).every(bKey => {
      const bVal = b[bKey]
      const aVal = a[bKey]
      if (typeof bVal === 'function') {
        return bVal(aVal)
      }
      return isPrimitive(bVal as Val)
        ? bVal === aVal
        : looksLike(aVal as Val, bVal as Val)
    })
  )
}

function isPrimitive(val: Val) {
  // eslint-disable-next-line
  return val == null || /^[sbn]/.test(typeof val)
}
