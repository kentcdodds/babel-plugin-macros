const npsUtils = require('nps-utils')

const series = npsUtils.series
const concurrent = npsUtils.concurrent
const rimraf = npsUtils.rimraf
const commonTags = npsUtils.commonTags
const oneLine = commonTags.oneLine

module.exports = {
  scripts: {
    contributors: {
      add: {
        description: 'When new people contribute to the project, run this',
        script: 'all-contributors add',
      },
      generate: {
        description: 'Update the badge and contributors table',
        script: 'all-contributors generate',
      },
    },
    commit: {
      description: oneLine`
        This uses commitizen to help us
        generate well formatted commit messages
      `,
      script: 'git-cz',
    },
    test: {
      default: 'jest --coverage',
      watch: 'jest --watch',
    },
    build: {
      description: 'delete the dist directory and run babel to build the files',
      script: series(
        rimraf('dist'),
        'babel --copy-files --out-dir dist --ignore __tests__ src'
      ),
    },
    lint: {
      description: 'lint the entire project',
      script: 'eslint .',
    },
    validate: {
      description: oneLine`
        This runs several scripts to make sure things look
        good before committing or on clean install
      `,
      script: concurrent.nps('lint', 'build', 'test'),
    },
  },
  options: {
    silent: false,
  },
}

// this is not transpiled
/*
  eslint
  comma-dangle: [
    2,
    {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      functions: 'never'
    }
  ]
 */
