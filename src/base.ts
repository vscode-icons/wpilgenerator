import fs from 'fs';
import http from 'http';
import https from 'https';
import url from 'url';
import * as models from './models';
import * as utils from './utils';
import { Logger } from './logger';
import { GitClient } from './git-client';
import { IParsedArgs, IResult, ISpinner } from './interfaces';

export abstract class BaseGenerator {
  public readonly defaultPrefix = 'default_';

  private readonly imagesUrl = 'https://github.com/vscode-icons/vscode-icons/blob/master/icons/';
  private readonly wikiUrl = 'https://raw.githubusercontent.com/wiki/%account%/vscode-icons';

  constructor(
    private wikiPageFilename: string,
    private repoFilename: string,
    private pargs: IParsedArgs,
    private gitClient: GitClient,
    public logger: Logger,
    public logGroupId: string) { }

  public abstract createList(): string;

  public async generate(): Promise<IResult> {
    const wikiPageContent = await this.getWikiPage();
    const createdList = this.createList();

    const hasChanged = this.compareLists(wikiPageContent, createdList);

    if (this.pargs.output === 'repo' && !hasChanged) { return; }

    const newWikiPage = this.createNewWikiPage(wikiPageContent, createdList);

    this.tryWriteToFile(newWikiPage);

    return { filename: this.wikiPageFilename, content: newWikiPage };
  }

  public getHeaders(list: string[]): string {
    let text = '';
    list.forEach((element: string, index: number) => {
      text += `| ${element} ${this.getLineEnd(list, index)}`;
    });

    for (let i = 0; i < list.length; i++) {
      text += `| :---: ${this.getLineEnd(list, i)}`;
    }

    return text;
  }

  public getName(extension: models.IDefaultExtension): string {
    let text = '| ';
    if (!extension) { return text; }
    text += this.pargs.useSmallFonts ? '<sub>' : '';
    text += `${extension.icon} `;
    text = this.pargs.useSmallFonts ? text.replace(/\s*$/, '</sub> ') : text;
    return text;
  }

  public getExtensions(extension: models.IExtension): string {
    let text = '| ';

    if (!extension) { return text; }

    text += this.pargs.useSmallFonts ? '<sub>' : '';

    let hasEntries = false;
    const fileExtension = extension as models.IFileExtension;

    if (extension.extensions) {
      const isFilename = fileExtension.filename !== undefined && fileExtension.filename;
      if (!isFilename) {
        // extensions
        extension.extensions.forEach((ext: string, index: number) => {
          text += `${this.normalize(ext)}${(index === extension.extensions.length - 1 ? ' ' : ', ')}`;
        });
      } else {
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

  public getDarkThemeImages(
    extension: models.IDefaultExtension,
    extensionPrefix?: string,
    isFolder = false): string {
    let text = '| ';

    if (!extension) { return text; }

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

  public getLightThemeImages(
    extension: models.IExtension,
    extensionPrefix?: string,
    isFolder = false,
    hasLightImage = false) {
    let text = '| ';

    if (!extension) { return text; }

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
    } else {
      text += '| ';
    }

    return text;
  }

  public getLineEnd(list: any[], index: number): string {
    return index === list.length - 1 ? '|\n' : '';
  }

  private normalize(text: string): string {
    const regex = /[_*]/g;
    const match = text.match(regex);
    if (!match) { return text; }
    return text.replace(regex, `\\${match[0]}`);
  }

  private tryWriteToFile(content: string): void {
    if (!content) { return; }

    const dirname = this.pargs.output === 'repo'
      ? this.gitClient.wikiRepoFolder
      : __dirname;
    const filePath = utils.pathUnixJoin(dirname, this.wikiPageFilename);
    const filePathLog = this.pargs.output === 'repo'
      ? filePath.replace(`${this.gitClient.dirname}`, '')
      : filePath;

    this.logger.updateLog(`Writing new wiki page to: ${filePathLog}`, this.logGroupId);
    fs.writeFileSync(filePath, content);
  }

  private createNewWikiPage(wikePage: string, newList: string): string {
    try {
      this.logger.log('Starting new wiki page creation', this.logGroupId);
      const newWikiPage = wikePage.replace(this.getReplaceText(wikePage), newList);
      this.logger.updateLog('New wiki page created', this.logGroupId);
      return newWikiPage;
    } catch (e) {
      throw new Error(`Failed creating new wiki page with reason: ${e}`);
    }
  }

  private getFilenames(extension: models.IFileExtension): string {
    let text = '';

    const populateFn = (ext, index, list) => text += `**${ext}**${(index === list.length - 1 ? ' ' : ', ')}`;

    // extensions as filenames
    extension.extensions.forEach((ext, index) => populateFn(ext, index, extension.extensions));

    // filenamesGlobs and extensionGlobs
    const hasGlobDefinitions: boolean = extension.filenamesGlob && extension.filenamesGlob.length &&
      extension.extensionsGlob && !!extension.extensionsGlob.length;

    if (!hasGlobDefinitions) { return text; }

    // In case there are extensions as filenames entries already
    text = text !== '' ? text.replace(/\s*$/, ', ') : text;

    utils.combine(extension.filenamesGlob, extension.extensionsGlob)
      .forEach((ext, index, extensions) => populateFn(ext, index, extensions));

    return text;
  }

  private getLanguageIds(extension: models.IFileExtension): string {
    let text = '';

    const populateFn = (langIds, index, list) =>
      text += `\`${langIds}\`${(index === list.length - 1 ? ' ' : ', ')}`;

    extension.languages.forEach((lang, index) => {
      if (Array.isArray(lang.ids)) {
        lang.ids.forEach((langId, lIndex, list) => populateFn(langId, lIndex, list));
        return;
      }
      populateFn(lang.ids, index, extension.languages);
    });

    return text;
  }

  private getReplaceText(text: string): string {
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

  private getWikiPage(): Promise<string> {
    return new Promise((res, rej) => {
      if (this.pargs.output === 'repo') {
        try {
          const filePath = utils.pathUnixJoin(this.gitClient.wikiRepoFolder, this.wikiPageFilename);
          this.logger.log(`Reading wiki page from: ${filePath.replace(`${this.gitClient.dirname}`, '')}`,
            this.logGroupId);
          const str = fs.readFileSync(filePath).toString();
          return res(str);
        } catch (e) {
          return rej(e);
        }
      }

      const uri = `${this.wikiUrl.replace(/%account%/, this.pargs.account)}/${this.wikiPageFilename}`;

      const spinner: ISpinner = this.logger.spinnerLogStart(`Requesting wiki page from: ${uri}`, this.logGroupId);

      const response = (resp: http.IncomingMessage): void => {
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
      const options: https.RequestOptions = url.parse(uri);
      https.get(options, response);
    });
  }

  private compareLists(wikiPageContent, createdList): boolean {
    if (this.pargs.output !== 'repo') { return false; }

    this.logger.updateLog(`Checking for changes to: '${this.repoFilename}'`, this.logGroupId);

    const newIconsList = createdList.split(/\r\n|\n/gm);
    if (!newIconsList[newIconsList.length - 1]) { newIconsList.pop(); }
    const currentIconsList = this.getReplaceText(wikiPageContent).split(/\r\n|\n/gm);
    if (!currentIconsList[currentIconsList.length - 1]) { currentIconsList.pop(); }

    this.logger.updateLog('Comparing lists', this.logGroupId);

    const hasChanged = !newIconsList.every((value, index) => value === currentIconsList[index]);

    this.logger.updateLog(`${hasChanged ? 'C' : 'No c'}hanges detected to: '${this.repoFilename}'`,
      this.logGroupId);

    return hasChanged;
  }
}
