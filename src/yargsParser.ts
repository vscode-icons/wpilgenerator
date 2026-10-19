import type { Arguments, Options } from 'yargs';

import type { IParsedArgs } from './interfaces';
import type { Logger } from './logger';

import yargs from 'yargs';

export class YargsParser {
  private readonly allowedOutputs = ['file', 'repo'];
  private readonly defaultAccount = 'vscode-icons';
  private readonly yargs = yargs(process.argv.slice(2));

  constructor(private logger: Logger) {
    const options: { [key: string]: Options } = {
      out: {
        alias: 'o',
        description: 'The output type',
        required: true,
        requiresArg: true,
        type: 'string',
      },
      account: {
        alias: 'a',
        description: 'The GitHub account to use',
        default: this.defaultAccount,
        requiresArg: true,
        type: 'string',
      },
      token: {
        alias: 't',
        description: 'The GitHub token to use for pushing commits',
        requiresArg: true,
        type: 'string',
      },
    };

    this.yargs
      .usage('Usage: $0 <command> [options]')
      .command(
        'all',
        'Generates the list of files and list of folders wiki page',
      )
      .command('files', 'Generates the list of files wiki page')
      .command('folders', 'Generates the list of folders wiki page')
      .demandCommand(1, 'Missing command')
      .recommendCommands()
      .options(options)
      .choices('out', this.allowedOutputs)
      .help()
      .alias('help', 'h')
      .version()
      .alias('version', 'V')
      .check((argv: Arguments): boolean => this.validate(argv))
      .strict();
  }

  public async parse(): Promise<IParsedArgs> {
    const pargs = await this.yargs.parse();
    return {
      command: pargs._[0] as string,
      account: pargs.account as string,
      output: pargs.out as string,
      token: pargs.token as string,
    };
  }

  private validate(pargs: Arguments): boolean {
    if (pargs.out === 'repo' && !pargs.token) {
      this.yargs.showHelp();
      this.logger.error(`No token provided`);
      process.exit(1);
    }
    if (pargs.account !== this.defaultAccount) {
      this.logger.log(`Using account: ${pargs.account as string}`);
    }
    return true;
  }
}
