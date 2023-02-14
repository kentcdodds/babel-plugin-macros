import myEval from '../eval.macro'

const result: number = myEval`+('4' + '2')`

declare global {
    var result: number;
  }

global.result = result
