import { Logger } from './logger';
import { IParsedArgs } from './interfaces';

export class Parser {

  public static parse(args: string[], logger: Logger): IParsedArgs {
    const showHelp = this.allowedCommands.indexOf(args[2]) === -1;
    const helpIndex = args.findIndex(arg => arg === '--help' || arg === '-h');
    const argsList = args.filter(arg => arg.startsWith('--') || arg.startsWith('-'));
    const hasValidArgs = !!argsList.length && argsList.every(arg => this.allowedArgs.indexOf(arg) !== -1);

    if (showHelp || !hasValidArgs || helpIndex !== -1) {
      logger.log(this.getHelpText());
      process.exit();
    }

    let output: string;
    const outputMsg = `Valid values for 'out' are: [${this.allowedOutputs.join('], [')}]`;
    let outIndex = args.findIndex(arg => arg === '--out' || arg === '-o');
    if (outIndex !== -1) {
      output = args[++outIndex];
      if (output && this.allowedOutputs.every(out => out !== output)) {
        logger.error(outputMsg);
        process.exit();
      }
    }

    if (!output) {
      logger.error(`Setting 'out' argument is mandatory. ${outputMsg}`);
      process.exit();
    }

    let token: string;
    let tokenIndex = args.findIndex(arg => arg === '--token' || arg === '-t');
    if (tokenIndex !== -1) {
      token = args[++tokenIndex];
    }
    if (output === 'repo' && (!token || token.startsWith('-'))) {
      logger.error(`No token provided.`);
      process.exit();
    }

    let account = 'vscode-icons';
    let accountIndex = args.findIndex(arg => arg === '--account' || arg === '-acc');
    if (accountIndex !== -1) {
      account = args[++accountIndex];
      if (!account || account.startsWith('-')) {
        logger.error(`No account provided.`);
        process.exit();
      }
      logger.log(`Using account: ${account}`);
    }

    const useSmallFonts = args.some(arg => arg === '--useSmallFonts' || arg === '-usf');
    const command = args[2];

    return {
      command,
      account,
      output,
      token,
      useSmallFonts,
    };
  }

  private static readonly allowedOutputs = ['file', 'repo'];
  private static readonly allowedCommands = ['all', 'files', 'folders'];
  private static readonly allowedArgs = [
    '--help',
    '-h',
    '--out',
    '-o',
    '--account',
    '-acc',
    '--token',
    '-t',
  ];

  private static getHelpText(): string {
    return `
  Commands:

    all      : Generates the list of files and list of folders wiki page.
    files    : Generates the list of files wiki page.
    folders  : Generates the list of folders wiki page.

  Arguments:

    --out             [-o]      : The output type, [${this.allowedOutputs.join('] or [')}] (mandatory).
    --account         [-acc]    : The GitHub account to use. Default is [vscode-icons].
    --token           [-t]      : The GitHub token to use when pushing commits to repository.
    `;
  }
}
