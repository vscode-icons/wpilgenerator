#!/usr/bin/env node

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
      logger.error(message);
    }
    checkPassed = !checkFailed;
  };

  if (pargv.length === 2) {
    doCheck(
      (): boolean =>
        !penv.GH_TOKEN ||
        penv.GH_TOKEN === '' ||
        !penv.GITHUB_TOKEN ||
        penv.GITHUB_TOKEN === '',
      'Error: GitHub token environment variable is not set',
    );
    doCheck(
      (): boolean => penv.RUNNER_OS !== 'Linux',
      `Error: Running on '${penv.RUNNER_OS}' is not allowed`,
    );
    doCheck(
      (): boolean =>
        penv.GITHUB_EVENT_NAME !== 'push' &&
        penv.GITHUB_REF_NAME !== 'workflow_dispatch',
      `Error: Running on '${penv.GITHUB_EVENT_NAME}' is not allowed`,
    );
    doCheck(
      (): boolean => penv.GITHUB_REF_TYPE !== 'branch',
      `Error: Running on '${penv.GITHUB_REF_TYPE}' is not allowed`,
    );
    doCheck(
      (): boolean =>
        penv.GITHUB_REF_NAME !== 'master' && penv.GITHUB_REF_NAME !== 'main',
      `Error: Running on branch '${penv.GITHUB_REF_NAME}' is not allowed`,
    );
    doCheck(
      (): boolean => penv.GITHUB_REPOSITORY !== 'vscode-icons/vscode-icons',
      `Error: Running on '${penv.GITHUB_REPOSITORY}' is not allowed`,
    );
    if (!checkPassed) {
      process.exitCode = 1;
      return;
    }
    pargv.push(
      'all',
      '-o',
      'repo',
      '-t',
      (penv.GH_TOKEN || penv.GITHUB_TOKEN) ?? '',
    );
  }
  void main();
})();
