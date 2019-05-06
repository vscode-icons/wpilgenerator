#!/usr/bin/env node

import { Logger } from './logger';
import * as wpilgen from './wpilgenerator';

(() => {
  const pargv = process.argv;
  const penv = process.env;
  let checkPassed = true;
  const doCheck = (checkFn: () => boolean, message: string) => {
    if (!checkPassed) { return; }
    const checkFailed = !!checkFn();
    if (checkFailed) { new Logger().log(message); }
    checkPassed = !checkFailed;
  };
  if (pargv.length === 2) {
    doCheck(() => (penv.TRAVIS_SECURE_ENV_VARS !== 'true') || (penv.GH_TOKEN === ''),
      'Secure environment variable is not set');
    doCheck(() => penv.TRAVIS_OS_NAME !== 'linux',
      `Running on '${penv.TRAVIS_OS_NAME}' is not allowed`);
    doCheck(() => penv.TRAVIS_PULL_REQUEST !== 'false',
      'Running on Pull Request is not allowed');
    doCheck(() => penv.TRAVIS_BRANCH !== 'master',
      `Running on branch '${penv.TRAVIS_BRANCH}' is not allowed`);
    doCheck(() => penv.TRAVIS_REPO_SLUG !== 'vscode-icons/vscode-icons',
      `Running on '${penv.TRAVIS_REPO_SLUG}' is not allowed`);
    if (!checkPassed) { return; }
    pargv.push('all', '-o', 'repo', '-t', penv.GH_TOKEN);
  }
  wpilgen.main();
})();
