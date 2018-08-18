"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const url_1 = __importDefault(require("url"));
const models = __importStar(require("./models"));
const utils = __importStar(require("./utils"));
class BaseGenerator {
    constructor(wikiPageFilename, repoFilename, pargs, gitClient, logger, logGroupId) {
        this.wikiPageFilename = wikiPageFilename;
        this.repoFilename = repoFilename;
        this.pargs = pargs;
        this.gitClient = gitClient;
        this.logger = logger;
        this.logGroupId = logGroupId;
        this.defaultPrefix = 'default_';
        this.imagesUrl = 'https://github.com/vscode-icons/vscode-icons/blob/master/icons/';
        this.wikiUrl = 'https://raw.githubusercontent.com/wiki/%account%/vscode-icons';
    }
    generate() {
        return __awaiter(this, void 0, void 0, function* () {
            const wikiPageContent = yield this.getWikiPage();
            const createdList = this.createList();
            const hasChanged = this.compareLists(wikiPageContent, createdList);
            if (this.pargs.output === 'repo' && !hasChanged) {
                return;
            }
            const newWikiPage = this.createNewWikiPage(wikiPageContent, createdList);
            this.tryWriteToFile(newWikiPage);
            return { filename: this.wikiPageFilename, content: newWikiPage };
        });
    }
    getHeaders(list) {
        let text = '';
        list.forEach((element, index) => {
            text += `| ${element} ${this.getLineEnd(list, index)}`;
        });
        for (let i = 0; i < list.length; i++) {
            text += `| :---: ${this.getLineEnd(list, i)}`;
        }
        return text;
    }
    getName(extension) {
        let text = '| ';
        if (!extension) {
            return text;
        }
        text += this.pargs.useSmallFonts ? '<sub>' : '';
        text += `[${extension.icon}](#${extension.icon}) `;
        text = this.pargs.useSmallFonts ? text.replace(/\s*$/, '</sub> ') : text;
        return text;
    }
    getExtensions(extension) {
        let text = '| ';
        if (!extension) {
            return text;
        }
        text += this.pargs.useSmallFonts ? '<sub>' : '';
        let hasEntries = false;
        const fileExtension = extension;
        if (extension.extensions) {
            const isFilename = fileExtension.filename !== undefined && fileExtension.filename;
            if (!isFilename) {
                const populateFn = (ext, index, list) => text += `${this.normalize(ext)}${(index === list.length - 1 ? ' ' : ', ')}`;
                // extensions
                extension.extensions.forEach((ext, index) => populateFn(ext, index, extension.extensions));
                // filenamesGlobs and extensionGlobs
                const hasGlobDefinitions = fileExtension.filenamesGlob && fileExtension.filenamesGlob.length &&
                    fileExtension.extensionsGlob && !!fileExtension.extensionsGlob.length;
                if (hasGlobDefinitions) {
                    // In case there are extensions already
                    text = /^\|\s(?:<sub>)?/.test(text) ? text : text.replace(/\s*$/, ', ');
                    utils.combine(fileExtension.filenamesGlob, fileExtension.extensionsGlob)
                        .forEach((ext, index, extensions) => populateFn(ext, index, extensions));
                }
            }
            else {
                // filenames
                text += this.getFilenames(fileExtension);
            }
            hasEntries = !!extension.extensions.length;
        }
        if (fileExtension.languages && fileExtension.languages.length) {
            // In case there are extensions entries already
            text = hasEntries ? text.replace(/\s*$/, ', ') : text;
            text += this.getLanguageIds(fileExtension);
        }
        text = this.pargs.useSmallFonts ? text.replace(/\s*$/, '</sub> ') : text;
        return text;
    }
    getDarkThemeImages(extension, extensionPrefix, isFolder = false) {
        let text = '| ';
        if (!extension) {
            return text;
        }
        const prefix = extensionPrefix || this.defaultPrefix;
        const fileExtension = typeof extension.format === 'string'
            ? extension.format
            : models.FileFormat[extension.format];
        // dark theme (closed)
        text += `![${extension.icon}_dark${(isFolder ? '_closed' : '')}](${this.imagesUrl}` +
            `${prefix}${extension.icon}.${fileExtension}) `;
        if (isFolder) {
            // dark theme (opened)
            text += `| ![${extension.icon}_dark_opened](${this.imagesUrl}` +
                `${prefix}${extension.icon}_opened.${fileExtension}) `;
        }
        return text;
    }
    getLightThemeImages(extension, extensionPrefix, isFolder = false, hasLightImage = false) {
        let text = '| ';
        if (!extension) {
            return text;
        }
        const prefix = extensionPrefix || this.defaultPrefix;
        if (extension.light || hasLightImage) {
            const fileExtension = typeof extension.format === 'string'
                ? extension.format
                : models.FileFormat[extension.format];
            // light theme (closed)
            text += `![${extension.icon}_light${(isFolder ? '_closed' : '')}](${this.imagesUrl}` +
                `${prefix}${extension.icon}.${fileExtension}) `;
            if (isFolder) {
                // light theme (opened)
                text += `| ![${extension.icon}_light_opened](${this.imagesUrl}` +
                    `${prefix}${extension.icon}_opened.${fileExtension}) `;
            }
        }
        else {
            text += '| ';
        }
        return text;
    }
    getLineEnd(list, index) {
        return index === list.length - 1 ? '|\n' : '';
    }
    normalize(text) {
        const regex = /[_*]/g;
        const match = text.match(regex);
        if (!match) {
            return text;
        }
        return text.replace(regex, `\\${match[0]}`);
    }
    tryWriteToFile(content) {
        if (!content) {
            return;
        }
        const dirname = this.pargs.output === 'repo'
            ? this.gitClient.wikiRepoFolder
            : __dirname;
        const filePath = utils.pathUnixJoin(dirname, this.wikiPageFilename);
        const filePathLog = this.pargs.output === 'repo'
            ? filePath.replace(`${this.gitClient.dirname}`, '')
            : filePath;
        this.logger.updateLog(`Writing new wiki page to: ${filePathLog}`, this.logGroupId);
        fs_1.default.writeFileSync(filePath, content);
    }
    createNewWikiPage(wikePage, newList) {
        try {
            this.logger.log('Starting new wiki page creation', this.logGroupId);
            const newWikiPage = wikePage.replace(this.getReplaceText(wikePage), newList);
            this.logger.updateLog('New wiki page created', this.logGroupId);
            return newWikiPage;
        }
        catch (e) {
            throw new Error(`Failed creating new wiki page with reason: ${e}`);
        }
    }
    getFilenames(extension) {
        let text = '';
        const populateFn = (ext, index, list) => text += `**${ext}**${(index === list.length - 1 ? ' ' : ', ')}`;
        // extensions as filenames
        extension.extensions.forEach((ext, index) => populateFn(ext, index, extension.extensions));
        // filenamesGlobs and extensionGlobs
        const hasGlobDefinitions = extension.filenamesGlob && extension.filenamesGlob.length &&
            extension.extensionsGlob && !!extension.extensionsGlob.length;
        if (!hasGlobDefinitions) {
            return text;
        }
        // In case there are extensions as filenames entries already
        text = text !== '' ? text.replace(/\s*$/, ', ') : text;
        utils.combine(extension.filenamesGlob, extension.extensionsGlob)
            .forEach((ext, index, extensions) => populateFn(ext, index, extensions));
        return text;
    }
    getLanguageIds(extension) {
        let text = '';
        const populateFn = (langIds, index, list) => text += `\`${langIds}\`${(index === list.length - 1 ? ' ' : ', ')}`;
        extension.languages.forEach((lang, index) => {
            if (Array.isArray(lang.ids)) {
                lang.ids.forEach((langId, lIndex, list) => populateFn(langId, lIndex, list));
                return;
            }
            populateFn(lang.ids, index, extension.languages);
        });
        return text;
    }
    getReplaceText(text) {
        const regex = /^\|.*\|\r\n|^\|.*\|\n/gm;
        let strToReplace = '';
        let matches = regex.exec(text);
        while (matches) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (matches.index === regex.lastIndex) {
                regex.lastIndex++;
            }
            strToReplace += matches.join();
            // Repeat
            matches = regex.exec(text);
        }
        return strToReplace;
    }
    getWikiPage() {
        return new Promise((res, rej) => {
            if (this.pargs.output === 'repo') {
                try {
                    const filePath = utils.pathUnixJoin(this.gitClient.wikiRepoFolder, this.wikiPageFilename);
                    this.logger.log(`Reading wiki page from: ${filePath.replace(`${this.gitClient.dirname}`, '')}`, this.logGroupId);
                    const str = fs_1.default.readFileSync(filePath).toString();
                    return res(str);
                }
                catch (e) {
                    return rej(e);
                }
            }
            const uri = `${this.wikiUrl.replace(/%account%/, this.pargs.account)}/${this.wikiPageFilename}`;
            const spinner = this.logger.spinnerLogStart(`Requesting wiki page from: ${uri}`, this.logGroupId);
            const response = (resp) => {
                const body = [];
                resp.on('error', err => {
                    clearInterval(spinner.timer);
                    rej(err.stack);
                })
                    .on('data', chunk => body.push(chunk))
                    .on('end', _ => {
                    this.logger.spinnerLogStop(spinner, 'Wiki page received', this.logGroupId);
                    return res(Buffer.concat(body).toString());
                });
                if (resp.statusCode !== 200) {
                    return rej(resp.statusMessage);
                }
            };
            const options = url_1.default.parse(uri);
            https_1.default.get(options, response);
        });
    }
    compareLists(wikiPageContent, createdList) {
        if (this.pargs.output !== 'repo') {
            return false;
        }
        this.logger.updateLog(`Checking for changes to: '${this.repoFilename}'`, this.logGroupId);
        const newIconsList = createdList.split(/\r\n|\n/gm);
        if (!newIconsList[newIconsList.length - 1]) {
            newIconsList.pop();
        }
        const currentIconsList = this.getReplaceText(wikiPageContent).split(/\r\n|\n/gm);
        if (!currentIconsList[currentIconsList.length - 1]) {
            currentIconsList.pop();
        }
        this.logger.updateLog('Comparing lists', this.logGroupId);
        const hasChanged = !newIconsList.every((value, index) => value === currentIconsList[index]);
        this.logger.updateLog(`${hasChanged ? 'C' : 'No c'}hanges detected to: '${this.repoFilename}'`, this.logGroupId);
        return hasChanged;
    }
}
exports.BaseGenerator = BaseGenerator;
