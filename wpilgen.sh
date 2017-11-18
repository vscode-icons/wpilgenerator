#!/bin/bash
set -e
if [ "${TRAVIS_SECURE_ENV_VARS}" != "true" ] || [ "${GH_TOKEN}" == "" ]; then
  echo "Secure environment variable not set"
  exit
fi
if [ "${TRAVIS_OS_NAME}" != "linux" ]; then
  echo "Running on '${TRAVIS_OS_NAME}' not allowed"
  exit
fi
if [ "${TRAVIS_NODE_VERSION}" != "7.9.0" ]; then
  echo "Running on node v${TRAVIS_NODE_VERSION} not allowed"
  exit
fi
if [ "${TRAVIS_PULL_REQUEST}" != "false" ]; then
  echo "Running on Pull Request not allowed"
  exit
fi
if [ "${TRAVIS_BRANCH}" != "master" ]; then
  echo "Running on branch '${TRAVIS_BRANCH}' not allowed"
  exit
fi
if [ "${TRAVIS_REPO_SLUG}" != "vscode-icons/vscode-icons" ]; then
  echo "Running on '${TRAVIS_REPO_SLUG}' not allowed"
  exit
fi

npm run wpilgen all -- -o repo -t ${GH_TOKEN}
