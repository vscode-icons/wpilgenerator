import fs from 'fs';
import git from 'nodegit';
import { Logger } from './logger';
import { findDirectorySync, pathUnixJoin } from './utils';
import { IParsedArgs, ISpinner } from './interfaces';
import { clearInterval } from 'timers';

export class GitClient {

  public readonly dirname: string;
  public readonly wikiRepoFolder: string;

  private readonly codeRepoUrl: string;
  private readonly wikiRepoUrl: string;
  private readonly codeRepoFolder: string;
  private readonly logGroupId: string;

  private codeRepo: git.Repository;
  private wikiRepo: git.Repository;

  constructor(private pargs: IParsedArgs, private logger: Logger) {
    this.codeRepoUrl = 'https://github.com/%account%/vscode-icons'.replace(/%account%/, this.pargs.account);
    this.wikiRepoUrl = `${this.codeRepoUrl}.wiki`;
    this.dirname = pathUnixJoin(findDirectorySync('vscode-icons'), './../../');
    this.codeRepoFolder = pathUnixJoin(this.dirname, this.pargs.account, 'vscode-icons');
    this.wikiRepoFolder = pathUnixJoin(this.dirname, this.pargs.account, 'vscode-icons.wiki');
    this.logGroupId = 'git';
  }

  public async getCodeRepository(): Promise<void> {
    if (this.pargs.output !== 'repo') { return; }

    this.codeRepo = await this.getRepository(this.codeRepoUrl, this.codeRepoFolder);
  }

  public async getWikiRepository(): Promise<void> {
    if (this.pargs.output !== 'repo') { return; }

    this.wikiRepo = await this.getRepository(this.wikiRepoUrl, this.wikiRepoFolder);
  }

  public async checkFileChanged(filename: string): Promise<boolean> {
    if (this.pargs.output !== 'repo') { return; }
    if (!this.codeRepo) {
      await this.getCodeRepository();
    }

    return this.checkForDiff(this.codeRepo, filename);
  }

  public async tryCommitToWikiRepo(filename: string, content: string): Promise<boolean> {
    if (this.pargs.output !== 'repo' || !content) { return; }
    if (!this.wikiRepo) {
      await this.getWikiRepository();
    }

    return this.commit(this.wikiRepo, filename);
  }

  public async tryPushToWikiRepo(numOfCommit: number): Promise<void> {
    if (this.pargs.output !== 'repo') { return; }

    if (!this.wikiRepo) {
      await this.getWikiRepository();
    }

    let remote = await this.wikiRepo.getRemote('origin');
    if (!remote) {
      remote = this.addRemote(this.wikiRepo, this.wikiRepoUrl);
    }
    await this.push(remote, numOfCommit);
  }

  private async checkForDiff(repo: git.Repository, filename: string): Promise<boolean> {
    const commit = await repo.getMasterCommit();

    for (const diff of await commit.getDiff()) {
      for (const patch of await diff.patches()) {
        const exists = new RegExp(`.*/${filename}$`, 'gi').test(patch.newFile().path());
        if (exists) { return true; }
      }
    }

    return false;
  }

  private async getRepository(url: string, repoFolder: string): Promise<git.Repository> {
    return url && !fs.existsSync(repoFolder)
      ? this.cloneRepo(url, repoFolder)
      : git.Repository.open(repoFolder);
  }

  private async cloneRepo(url: string, repoFolder: string): Promise<git.Repository> {
    const message = `Cloning repo: '${url}' into '${repoFolder.replace(`${this.dirname}`, '')}'`;
    const spinner: ISpinner = this.logger.spinnerLogStart(message, this.logGroupId);
    try {
      const clone = await git.Clone.clone(url, repoFolder);
      this.logger.spinnerLogStop(spinner, message.replace('Cloning', 'Cloned'), this.logGroupId);

      return clone;
    } catch (e) {
      clearInterval(spinner.timer);
      throw e;
    }
  }

  private addRemote(repo: git.Repository, url: string): git.Remote {
    return git.Remote.create(repo, 'origin', url);
  }

  private async commit(repo: git.Repository, filename: string): Promise<boolean> {
    const spinner: ISpinner = this.logger.spinnerLogStart(`Creating commit`, this.logGroupId);

    try {
      const index = await repo.refreshIndex();

      // git add
      await index.addByPath(filename);

      if (!index.write()) {
        throw new Error(`Failed writing repo index.`);
      }

      const matches = filename.match(/files|folders/i);
      const name = matches && matches[0];
      if (!name) {
        throw new Error('Can not determine list name');
      }
      const commitMessage = `:robot: Update list of ${name.toLowerCase()}`;
      const time = +(Date.now() / 1000).toFixed(0); // unix UTC
      const author = git.Signature.create('vscode-icons-bot', 'vscode-icons-bot@github.com', time, 0); // our own bot!!
      const committer = author;
      const oid = await index.writeTree();
      const headId = await git.Reference.nameToId(repo, 'HEAD');

      // git commit
      await repo.createCommit('HEAD', author, committer, commitMessage, oid, [headId]);

      this.logger.spinnerLogStop(spinner, `Commit created: ${headId.tostrS()}`, this.logGroupId);

      return true;
    } catch (e) {
      clearInterval(spinner.timer);
      throw e;
    }
  }

  private async push(remote: git.Remote, numOfCommit: number): Promise<number> {
    const options: git.PushOptions = {
      callbacks: {
        credentials: () => git.Cred.userpassPlaintextNew(this.pargs.account, this.pargs.token),
      },
    };

    const suffix = numOfCommit > 1 ? 's' : '';
    const spinner: ISpinner = this.logger.spinnerLogStart(`Pushing commit${suffix} to: ${remote.url()}`,
      this.logGroupId);
    const timer = setTimeout(() => {
      clearInterval(spinner.timer);
      throw new Error('Timeout on push action');
    }, 60000);

    try {
      const result = await remote.push(['refs/heads/master:refs/heads/master'], options);
      this.logger.spinnerLogStop(spinner, `Commit${suffix} pushed`, this.logGroupId);
      clearTimeout(timer);
      return result;
    } catch (e) {
      clearInterval(spinner.timer);
      throw e;
    }
  }
}
