import { IParsedArgs } from './interfaces';
import { Logger } from './logger';
import { findDirectorySync, pathUnixJoin } from './utils';

export abstract class GitClient {
  public readonly dirname: string;
  public readonly wikiRepoFolder: string;

  protected readonly codeRepoUrl: string;
  protected readonly wikiRepoUrl: string;
  protected readonly codeRepoFolder: string;
  protected readonly logGroupId: string;

  constructor(
    protected pargs: IParsedArgs,
    protected logger: Logger,
  ) {
    this.codeRepoUrl = `https://github.com/${this.pargs.account}/vscode-icons`;
    this.wikiRepoUrl = `${this.codeRepoUrl}.wiki`;
    this.dirname = pathUnixJoin(findDirectorySync('vscode-icons'), './../../');
    this.codeRepoFolder = pathUnixJoin(
      this.dirname,
      this.pargs.account,
      'vscode-icons',
    );
    this.wikiRepoFolder = pathUnixJoin(
      this.dirname,
      this.pargs.account,
      'vscode-icons.wiki',
    );
    this.logger = logger;
    this.logGroupId = 'git';
  }

  public abstract getCodeRepository(): Promise<void>;

  public abstract getWikiRepository(): Promise<void>;

  public abstract tryCommitToWikiRepo(
    filename: string,
    content: string,
  ): Promise<boolean>;

  public abstract tryPushToWikiRepo(numOfCommit: number): Promise<void>;
}
