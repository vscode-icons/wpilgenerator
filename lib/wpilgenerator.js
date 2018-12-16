"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const yargsParser_1 = require("./yargsParser");
const utils_1 = require("./utils");
const git_client_1 = require("./git-client");
const filesListGenerator_1 = require("./filesListGenerator");
const foldersListGenerator_1 = require("./foldersListGenerator");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const logger = new logger_1.Logger();
        try {
            const pargs = new yargsParser_1.YargsParser(logger).parse();
            const gitClient = new git_client_1.GitClient(pargs, logger);
            // Locate 'vscode-icons' root directory
            const rootDir = utils_1.findDirectorySync('vscode-icons');
            // Find files and folders path
            const baseRegex = 'src(?:(?:\\/|\\\\)[a-zA-Z0-9\\s_@\-^!#$%&+={}\\[\\]]+)*(?:\\/|\\\\)';
            const extensionsRegex = new RegExp(`${baseRegex}supportedExtensions\\.js`);
            const filesPath = utils_1.findFileSync(extensionsRegex, rootDir)[0];
            const foldersRegex = new RegExp(`${baseRegex}supportedExtensions\\.js`);
            const foldersPath = utils_1.findFileSync(foldersRegex, rootDir)[0];
            const files = require(filesPath).extensions;
            const folders = require(foldersPath).extensions;
            // clone or open repo
            yield Promise.all([gitClient.getCodeRepository(), gitClient.getWikiRepository()]);
            let results = [];
            switch (pargs.command) {
                case 'all':
                    {
                        results = yield Promise.all([
                            new filesListGenerator_1.FilesListGenerator(files, pargs, gitClient, logger).generate(),
                            new foldersListGenerator_1.FoldersListGenerator(folders, pargs, gitClient, logger).generate(),
                        ]);
                        results = results.filter(res => res);
                        break;
                    }
                case 'files':
                    {
                        const result = yield new filesListGenerator_1.FilesListGenerator(files, pargs, gitClient, logger).generate();
                        if (result) {
                            results.push(result);
                        }
                        break;
                    }
                case 'folders':
                    {
                        const result = yield new foldersListGenerator_1.FoldersListGenerator(folders, pargs, gitClient, logger).generate();
                        if (result) {
                            results.push(result);
                        }
                        break;
                    }
            }
            let hasCommit;
            if (results) {
                const asyncForEach = (array, callback) => __awaiter(this, void 0, void 0, function* () {
                    for (let index = 0; index < array.length; index++) {
                        yield callback(array[index], index, array);
                    }
                });
                yield asyncForEach(results, (result) => __awaiter(this, void 0, void 0, function* () {
                    if (!result) {
                        return;
                    }
                    hasCommit = (yield gitClient.tryCommitToWikiRepo(result.filename, result.content)) || hasCommit;
                }));
            }
            if (hasCommit) {
                yield gitClient.tryPushToWikiRepo(results.length);
            }
            logger.log('Finished');
        }
        catch (e) {
            const error = e instanceof Error ? e : new Error(e);
            logger.error(error.stack);
            process.exit(1);
        }
    });
}
exports.main = main;
