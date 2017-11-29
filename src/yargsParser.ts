import * as y from 'yargs';
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
      .strict();
  }

  public parse(): IParsedArgs {
    y.parse(process.argv.splice(2));

    if (y.argv.out === 'repo' && !!!y.argv.token) {
      this.logger.error(`No token provided`);
      process.exit();
    }

    if (y.argv.account !== this.defaultAccount) {
      this.logger.log(`Using account: ${y.argv.account}`);
    }

    return {
      command: y.argv._[0],
      account: y.argv.account,
      output: y.argv.out,
      token: y.argv.token,
    };
  }
}
