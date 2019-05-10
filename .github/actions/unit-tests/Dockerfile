FROM node:latest

LABEL "com.github.actions.name"="voldemortensen npm"
LABEL "com.github.actions.description"="Run npm tests"
LABEL "com.github.actions.icon"="check"
LABEL "com.github.actions.color"="blue"

LABEL "repository"="http://github.com/voldemortensen/phpunit-ga"
LABEL "homepage"="http://github.com/actions"
LABEL "maintainer"="<voldemortensen opensource@garthmortensen.com>"

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
