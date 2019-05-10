workflow "pull request tests" {
  on = "pull_request"
  resolves = ["run tests"]
}

action "run tests" {
  uses = "./.github/actions/unit-tests"
}
