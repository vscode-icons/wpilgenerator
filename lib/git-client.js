"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const nodegit_1 = __importDefault(require("nodegit"));
const utils_1 = require("./utils");
const timers_1 = require("timers");
class GitClient {
    constructor(pargs, logger) {
        this.pargs = pargs;
        this.logger = logger;
        this.codeRepoUrl = 'https://github.com/%account%/vscode-icons'.replace(/%account%/, this.pargs.account);
        this.wikiRepoUrl = `${this.codeRepoUrl}.wiki`;
        this.dirname = utils_1.pathUnixJoin(utils_1.findDirectorySync('vscode-icons'), './../../');
        this.codeRepoFolder = utils_1.pathUnixJoin(this.dirname, this.pargs.account, 'vscode-icons');
        this.wikiRepoFolder = utils_1.pathUnixJoin(this.dirname, this.pargs.account, 'vscode-icons.wiki');
        this.logGroupId = 'git';
    }
    getCodeRepository() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pargs.output !== 'repo') {
                return;
            }
            this.codeRepo = yield this.getRepository(this.codeRepoUrl, this.codeRepoFolder);
        });
    }
    getWikiRepository() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pargs.output !== 'repo') {
                return;
            }
            this.wikiRepo = yield this.getRepository(this.wikiRepoUrl, this.wikiRepoFolder);
        });
    }
    checkFileChanged(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pargs.output !== 'repo') {
                return;
            }
            if (!this.codeRepo) {
                yield this.getCodeRepository();
            }
            return this.checkForDiff(this.codeRepo, filename);
        });
    }
    tryCommitToWikiRepo(filename, content) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pargs.output !== 'repo' || !content) {
                return;
            }
            if (!this.wikiRepo) {
                yield this.getWikiRepository();
            }
            return this.commit(this.wikiRepo, filename);
        });
    }
    tryPushToWikiRepo(numOfCommit) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pargs.output !== 'repo') {
                return;
            }
            if (!this.wikiRepo) {
                yield this.getWikiRepository();
            }
            let remote = yield this.wikiRepo.getRemote('origin');
            if (!remote) {
                remote = this.addRemote(this.wikiRepo, this.wikiRepoUrl);
            }
            yield this.push(remote, numOfCommit);
        });
    }
    checkForDiff(repo, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const commit = yield repo.getMasterCommit();
            for (const diff of yield commit.getDiff()) {
                for (const patch of yield diff.patches()) {
                    const exists = new RegExp(`.*/${filename}$`, 'gi').test(patch.newFile().path());
                    if (exists) {
                        return true;
                    }
                }
            }
            return false;
        });
    }
    getRepository(url, repoFolder) {
        return __awaiter(this, void 0, void 0, function* () {
            return url && !fs_1.default.existsSync(repoFolder)
                ? this.cloneRepo(url, repoFolder)
                : nodegit_1.default.Repository.open(repoFolder);
        });
    }
    cloneRepo(url, repoFolder) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = `Cloning repo: '${url}' into '${repoFolder.replace(`${this.dirname}`, '')}'`;
            const spinner = this.logger.spinnerLogStart(message, this.logGroupId);
            try {
                const clone = yield nodegit_1.default.Clone.clone(url, repoFolder);
                this.logger.spinnerLogStop(spinner, message.replace('Cloning', 'Cloned'), this.logGroupId);
                return clone;
            }
            catch (e) {
                timers_1.clearInterval(spinner.timer);
                throw e;
            }
        });
    }
    addRemote(repo, url) {
        return nodegit_1.default.Remote.create(repo, 'origin', url);
    }
    commit(repo, filename) {
        return __awaiter(this, void 0, void 0, function* () {
            const spinner = this.logger.spinnerLogStart(`Creating commit`, this.logGroupId);
            try {
                const index = yield repo.refreshIndex();
                yield index.addByPath(filename);
                if (!index.write()) {
                    throw new Error(`Failed writing repo index.`);
                }
                const matches = filename.match(/files|folders/i);
                const name = matches && matches[0];
                if (!name) {
                    throw new Error('Can not determine list name');
                }
                const commitMessage = `:robot: Update list of ${name.toLowerCase()}`;
                const time = +(Date.now() / 1000).toFixed(0);
                const author = nodegit_1.default.Signature.create('vscode-icons-bot', 'vscode-icons-bot@github.com', time, 0);
                const committer = author;
                const oid = yield index.writeTree();
                const headId = yield nodegit_1.default.Reference.nameToId(repo, 'HEAD');
                yield repo.createCommit('HEAD', author, committer, commitMessage, oid, [headId]);
                this.logger.spinnerLogStop(spinner, `Commit created: ${headId.tostrS()}`, this.logGroupId);
                return true;
            }
            catch (e) {
                timers_1.clearInterval(spinner.timer);
                throw e;
            }
        });
    }
    push(remote, numOfCommit) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                callbacks: {
                    credentials: () => nodegit_1.default.Cred.userpassPlaintextNew(this.pargs.account, this.pargs.token),
                },
            };
            const suffix = numOfCommit > 1 ? 's' : '';
            const spinner = this.logger.spinnerLogStart(`Pushing commit${suffix} to: ${remote.url()}`, this.logGroupId);
            const timer = setTimeout(() => {
                timers_1.clearInterval(spinner.timer);
                throw new Error('Timeout on push action');
            }, 60000);
            try {
                const result = yield remote.push(['refs/heads/master:refs/heads/master'], options);
                this.logger.spinnerLogStop(spinner, `Commit${suffix} pushed`, this.logGroupId);
                clearTimeout(timer);
                return result;
            }
            catch (e) {
                timers_1.clearInterval(spinner.timer);
                throw e;
            }
        });
    }
}
exports.GitClient = GitClient;
