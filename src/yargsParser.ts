import y = require('yargs');
import { Logger } from './logger';
import { IParsedArgs } from './interfaces';

export class YargsParser {
  private readonly allowedOutputs = ['file', 'repo'];
  private readonly defaultAccount = 'vscode-icons';

  constructor(private logger: Logger) {
    const options: { [key: string]: y.Options } = {
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

    y
      .usage('Usage: $0 <command> [options]')
      .command('all', 'Generates the list of files and list of folders wiki page')
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
      .check((argv: y.Arguments) => this.validate(argv))
      .strict();
  }

  public parse(): IParsedArgs {
    const pargs = y.parse(process.argv.splice(2));
    return {
      command: pargs._[0],
      account: pargs.account as string,
      output: pargs.out as string,
      token: pargs.token as string,
    };
  }

  private validate(pargs: y.Arguments): boolean {
    if (pargs.out === 'repo' && !pargs.token) {
      y.showHelp();
      this.logger.error(`No token provided`);
      process.exit(1);
    }
    if (pargs.account !== this.defaultAccount) {
      this.logger.log(`Using account: ${pargs.account}`);
    }
    return true;
  }
}
