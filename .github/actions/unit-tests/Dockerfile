FROM node:10

LABEL "com.github.actions.name"="Unit tests"
LABEL "com.github.actions.description"="Run npm via `npm run setup -s`"
LABEL "com.github.actions.icon"="check"
LABEL "com.github.actions.color"="blue"

LABEL "maintainer"="voldemortensen <opensource@garthmortensen.com>"

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
