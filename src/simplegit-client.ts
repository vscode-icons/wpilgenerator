import fs from 'fs';
import {
  CommitResult,
  Options,
  RemoteWithRefs,
  SimpleGit,
  TaskOptions,
  simpleGit,
} from 'simple-git';
import { clearInterval } from 'timers';
import { GitClient } from './git-client';
import { IParsedArgs, ISpinner } from './interfaces';
import { Logger } from './logger';
import { Mutex } from './mutex';

export class SimpleGitClient extends GitClient {
  private mutex: Mutex;
  private wikiRepo: SimpleGit;

  constructor(pargs: IParsedArgs, logger: Logger) {
    super(pargs, logger);
    this.mutex = new Mutex();
  }

  public async getCodeRepository(): Promise<void> {
    if (this.pargs.output !== 'repo') {
      return;
    }
    await this.getRepository(this.codeRepoUrl, this.codeRepoFolder, 5);
  }

  public async getWikiRepository(): Promise<void> {
    if (this.pargs.output !== 'repo') {
      return;
    }

    this.wikiRepo = await this.getRepository(
      this.wikiRepoUrl,
      this.wikiRepoFolder,
      5,
    );
  }

  public async tryCommitToWikiRepo(
    filename: string,
    content: string,
  ): Promise<boolean> {
    if (this.pargs.output !== 'repo' || !content) {
      return;
    }

    if (!this.wikiRepo) {
      await this.getWikiRepository();
    }

    return this.commit(this.wikiRepo, filename);
  }

  public async tryPushToWikiRepo(numOfCommit: number): Promise<void> {
    if (this.pargs.output !== 'repo') {
      return;
    }

    if (!this.wikiRepo) {
      await this.getWikiRepository();
    }

    const remote: RemoteWithRefs = await this.addRemote(
      this.wikiRepo,
      'origin',
      this.wikiRepoUrl,
    );

    await this.push(this.wikiRepo, remote, numOfCommit);
  }

  private getRepository(
    url: string,
    repoFolder: string,
    depth?: number,
  ): Promise<SimpleGit> {
    return url && !fs.existsSync(repoFolder)
      ? this.cloneRepo(url, repoFolder, depth)
      : Promise.resolve(simpleGit(repoFolder));
  }

  private async cloneRepo(
    url: string,
    repoFolder: string,
    depth?: number,
  ): Promise<SimpleGit> {
    const message = `Cloning repo: '${url}' into '${repoFolder.replace(
      `${this.dirname}`,
      '',
    )}'`;
    const spinner: ISpinner = this.logger.spinnerLogStart(
      message,
      this.logGroupId,
    );
    try {
      await simpleGit()
        .clone(url, repoFolder, depth ? { '--depth': depth } : [])
        .cwd(repoFolder);
      this.logger.spinnerLogStop(
        spinner,
        message.replace('Cloning', 'Cloned'),
        this.logGroupId,
      );
      const repo = simpleGit(repoFolder);
      return repo;
    } catch (e) {
      clearInterval(spinner.timer);
      throw e;
    }
  }

  private async commit(repo: SimpleGit, filename: string): Promise<boolean> {
    const spinner: ISpinner = this.logger.spinnerLogStart(
      `Creating commit`,
      this.logGroupId,
    );

    try {
      const matches: RegExpMatchArray = /files|folders/i.exec(filename);
      const name = matches && matches[0];
      if (!name) {
        throw new Error('Can not determine list name');
      }

      // our own bot!!
      const commitMessage = `:robot: Update list of ${name.toLowerCase()}`;
      const date = +(Date.now() / 1000).toFixed(0); // unix UTC
      const options: Options = {
        '--author': 'vscode-icons-bot <vscode-icons-bot@github.com>',
        '--date': date,
      };

      // lock the process for concurrent commits
      await this.mutex.lock();

      // git add & commit
      const result: CommitResult = await repo.commit(
        commitMessage,
        filename,
        options,
      );

      this.mutex.unlock();

      this.logger.spinnerLogStop(
        spinner,
        `Commit created: ${result.commit}`,
        this.logGroupId,
      );

      return true;
    } catch (e) {
      clearInterval(spinner.timer);
      throw e;
    }
  }

  private async addRemote(
    repo: SimpleGit,
    name: string,
    url: string,
  ): Promise<RemoteWithRefs> {
    const remote: string = await repo.listRemote(['--get-url', name]);
    if (remote) {
      await repo.removeRemote(name);
    }
    await repo.addRemote(name, url);
    return (await repo.getRemotes(true)).filter(
      (r: RemoteWithRefs) => r.name === name,
    )[0];
  }

  private async push(
    repo: SimpleGit,
    remote: RemoteWithRefs,
    numOfCommits: number,
  ): Promise<number> {
    const suffix = numOfCommits > 1 ? 's' : '';
    const spinner: ISpinner = this.logger.spinnerLogStart(
      `Pushing ${numOfCommits} commit${suffix} to: ${remote.name}`,
      this.logGroupId,
    );
    const timer = setTimeout(() => {
      clearInterval(spinner.timer);
      throw new Error('Timeout on push action');
    }, 60000);
    const options: TaskOptions = {
      // '--dry-run': null,
      // '--verbose': null,
      '--quiet': null,
    };

    try {
      await this.setCredentials(repo);
      await repo.push(remote.name, 'master', options);
      this.logger.spinnerLogStop(
        spinner,
        `${numOfCommits} commit${suffix} pushed`,
        this.logGroupId,
      );
      clearTimeout(timer);
      return Promise.resolve(numOfCommits);
    } catch (e) {
      clearInterval(spinner.timer);
      throw e;
    }
  }

  private async setCredentials(repo: SimpleGit) {
    await repo.addConfig('credential.username', this.pargs.account);
    await repo.addConfig(
      'credential.helper',
      `!f() { sleep 1; echo "password=${this.pargs.token}"; }; f`,
    );
  }
}
