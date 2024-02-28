#!/usr/bin/env node

import { exit } from 'process';
import { Logger } from './logger';
import { main } from './wpilgenerator';

((): void => {
  const logger = new Logger();
  const pargv = process.argv;
  const penv = process.env;
  let checkPassed = true;
  const doCheck = (checkFn: () => boolean, message: string): void => {
    if (!checkPassed) {
      return;
    }
    const checkFailed = !!checkFn();
    if (checkFailed) {
      logger.log(message);
    }
    checkPassed = !checkFailed;
  };

  if (pargv.length === 2) {
    doCheck(
      () => !penv.GH_TOKEN || penv.GH_TOKEN === '',
      'GitHub token environment variable is not set',
    );
    doCheck(
      () => penv.RUNNER_OS !== 'Linux',
      `Running on '${penv.RUNNER_OS}' is not allowed`,
    );
    doCheck(
      () =>
        penv.GITHUB_EVENT_NAME !== 'push' &&
        penv.GITHUB_REF_NAME !== 'workflow_dispatch',
      `Running on '${penv.GITHUB_EVENT_NAME}' is not allowed`,
    );
    doCheck(
      () => penv.GITHUB_REF_TYPE !== 'branch',
      `Running on '${penv.GITHUB_REF_TYPE}' is not allowed`,
    );
    doCheck(
      () =>
        penv.GITHUB_REF_NAME !== 'master' && penv.GITHUB_REF_NAME !== 'main',
      `Running on branch '${penv.GITHUB_REF_NAME}' is not allowed`,
    );
    doCheck(
      () => penv.GITHUB_REPOSITORY !== 'vscode-icons/vscode-icons',
      `Running on '${penv.GITHUB_REPOSITORY}' is not allowed`,
    );
    if (!checkPassed) {
      exit(1);
    }
    pargv.push('all', '-o', 'repo', '-t', penv.GH_TOKEN);
  }
  void main();
})();
