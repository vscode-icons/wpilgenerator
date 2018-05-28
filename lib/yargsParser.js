"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const y = require("yargs");
class YargsParser {
    constructor(logger) {
        this.logger = logger;
        this.allowedOutputs = ['file', 'repo'];
        this.defaultAccount = 'vscode-icons';
        const options = {
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
            .check((argv) => this.validate(argv))
            .strict();
    }
    parse() {
        const pargs = y.parse(process.argv.splice(2));
        return {
            command: pargs._[0],
            account: pargs.account,
            output: pargs.out,
            token: pargs.token,
        };
    }
    validate(pargs) {
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
exports.YargsParser = YargsParser;
