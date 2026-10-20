import type http from 'node:http';

import type { GitClient } from './git-client.ts';
import type { Logger } from './logger.ts';

import fs from 'node:fs';
import https from 'node:https';
import url from 'node:url';

import * as types from './types/index.ts';
import * as utils from './utils.ts';

export abstract class BaseGenerator {
  public readonly defaultPrefix = 'default_';

  protected logger: Logger;
  protected logGroupId: string;
  protected readonly imagesUrl: string;
  protected readonly wikiUrl: string;

  constructor(
    private wikiPageFilename: string,
    private repoFilename: string,
    private pargs: types.IParsedArgs,
    private gitClient: GitClient,
    logger: Logger,
    logGroupId: string,
  ) {
    this.logger = logger;
    this.logGroupId = logGroupId;
    this.imagesUrl = `https://github.com/${pargs.account}/vscode-icons/blob/master/icons/`;
    this.wikiUrl = `https://raw.githubusercontent.com/wiki/${pargs.account}/vscode-icons`;
  }

  public async generate(): Promise<types.IResult> {
    const wikiPageContent = await this.getWikiPage();
    const createdList = this.createList();

    const hasChanged = this.compareLists(wikiPageContent, createdList);

    if (this.pargs.output === 'repo' && !hasChanged) {
      return { filename: this.wikiPageFilename, content: wikiPageContent };
    }

    const newWikiPage = this.createNewWikiPage(wikiPageContent, createdList);

    this.tryWriteToFile(newWikiPage);

    return { filename: this.wikiPageFilename, content: newWikiPage };
  }

  public getHeaders(list: string[]): string {
    let text = '';
    list.forEach((element: string, index: number): void => {
      text += `| ${element} ${this.getLineEnd(list, index)}`;
    });

    for (let i = 0; i < list.length; i++) {
      text += `| :---: ${this.getLineEnd(list, i)}`;
    }

    return text;
  }

  public getName(extension?: types.IDefaultExtension): string {
    let text = '| ';
    if (!extension) {
      return text;
    }
    text += this.pargs.useSmallFonts ? '<sub>' : '';
    text += `[${extension.icon}](#${extension.icon}) `;
    text = this.pargs.useSmallFonts ? text.replace(/\s*$/, '</sub> ') : text;
    return text;
  }

  public getExtensions(fileExtension?: types.IDefaultExtension): string {
    let text = '| ';

    if (!fileExtension) {
      return text;
    }

    text += this.pargs.useSmallFonts ? '<sub>' : '';

    if (this.isFileExtension(fileExtension)) {
      if (fileExtension.filename) {
        // filenames
        text += this.getFilenames(fileExtension);
      } else {
        const populateFn = (
          ext: string,
          index: number,
          list: string[],
        ): string =>
          (text += `${this.normalize(ext)}${
            index === list.length - 1 ? ' ' : ', '
          }`);

        // extensions
        fileExtension.extensions.forEach((ext: string, index: number): string =>
          populateFn(ext, index, fileExtension.extensions),
        );

        // filenamesGlobs and extensionGlobs
        const hasGlobDefinitions: boolean =
          !!fileExtension.filenamesGlob &&
          !!fileExtension.filenamesGlob.length &&
          !!fileExtension.extensionsGlob &&
          !!fileExtension.extensionsGlob.length;

        if (hasGlobDefinitions) {
          // In case there are extensions already
          text = /^\|\s(?:<sub>)?/.test(text)
            ? text
            : text.replace(/\s*$/, ', ');

          utils
            .combine(
              fileExtension.filenamesGlob!,
              fileExtension.extensionsGlob!,
            )
            .forEach((ext, index, extensions): string =>
              populateFn(ext, index, extensions),
            );
        }
      }

      if (fileExtension.languages && fileExtension.languages.length) {
        // In case there are extensions entries already
        text = fileExtension.extensions.length
          ? text.replace(/\s*$/, ', ')
          : text;
        text += this.getLanguageIds(fileExtension);
      }
    }

    text = this.pargs.useSmallFonts ? text.replace(/\s*$/, '</sub> ') : text;

    return text;
  }

  public getDarkThemeImages(
    extension?: types.IDefaultExtension,
    extensionPrefix: string = this.defaultPrefix,
    isFolder = false,
  ): string {
    let text = '| ';

    if (!extension) {
      return text;
    }

    extension.format ??= types.FileFormat.svg;

    const fileExtension =
      typeof extension.format === 'string'
        ? extension.format
        : types.FileFormat[extension.format];

    // dark theme (closed)
    text +=
      `![${extension.icon}_dark${isFolder ? '_closed' : ''}](${
        this.imagesUrl
      }` + `${extensionPrefix}${extension.icon}.${fileExtension}) `;

    if (isFolder) {
      // dark theme (opened)
      text +=
        `| ![${extension.icon}_dark_opened](${this.imagesUrl}` +
        `${extensionPrefix}${extension.icon}_opened.${fileExtension}) `;
    }

    return text;
  }

  public getLightThemeImages(
    extension?: types.IDefaultExtension,
    extensionPrefix: string = this.defaultPrefix,
    isFolder = false,
    hasLightImage = false,
  ): string {
    let text = '| ';

    if (!extension) {
      return text;
    }

    extension.format ??= types.FileFormat.svg;

    if (
      !this.isFileExtension(extension) ||
      (!extension.light && !hasLightImage)
    ) {
      return isFolder ? `${text}| ` : text;
    }

    const fileExtension =
      typeof extension.format === 'string'
        ? extension.format
        : types.FileFormat[extension.format];

    // light theme (closed)
    text +=
      `![${extension.icon}_light${isFolder ? '_closed' : ''}](${this.imagesUrl}` +
      `${extensionPrefix}${extension.icon}.${fileExtension}) `;

    if (isFolder) {
      // light theme (opened)
      text +=
        `| ![${extension.icon}_light_opened](${this.imagesUrl}` +
        `${extensionPrefix}${extension.icon}_opened.${fileExtension}) `;
    }

    return text;
  }

  public getLineEnd(list: string[], index: number): string {
    return index === list.length - 1 ? '|\n' : '';
  }

  private isFileExtension(value: unknown): value is types.IFileExtension {
    return typeof value === 'object' && value !== null && 'extensions' in value;
  }

  private normalize(text: string): string {
    const regex = /[_*]/g;
    const match = text.match(regex);
    if (!match) {
      return text;
    }
    return text.replace(regex, `\\${match[0]}`);
  }

  private tryWriteToFile(content: string): void {
    if (!content) {
      return;
    }

    const dirname =
      this.pargs.output === 'repo' ? this.gitClient.wikiRepoFolder : __dirname;
    const filePath = utils.pathUnixJoin(dirname, this.wikiPageFilename);
    const filePathLog =
      this.pargs.output === 'repo'
        ? filePath.replace(`${this.gitClient.dirname}`, '')
        : filePath;

    this.logger.updateLog(
      `Writing new wiki page to: ${filePathLog}`,
      this.logGroupId,
    );
    fs.writeFileSync(filePath, content);
  }

  private createNewWikiPage(wikiPage: string, newList: string): string {
    try {
      this.logger.log('Starting new wiki page creation', this.logGroupId);
      const newWikiPage = wikiPage.replace(
        this.getReplaceText(wikiPage),
        newList,
      );
      this.logger.updateLog('New wiki page created', this.logGroupId);
      return newWikiPage;
    } catch (e) {
      throw new Error('Failed creating new wiki page', { cause: e });
    }
  }

  private getFilenames(extension: types.IFileExtension): string {
    let text = '';

    const populateFn = (ext: string, index: number, list: string[]): string =>
      (text += `**${ext}**${index === list.length - 1 ? ' ' : ', '}`);

    // extensions as filenames
    extension.extensions.forEach((ext, index): string =>
      populateFn(ext, index, extension.extensions),
    );

    // filenamesGlobs and extensionGlobs
    const hasGlobDefinitions: boolean =
      !!extension.filenamesGlob &&
      !!extension.filenamesGlob.length &&
      !!extension.extensionsGlob &&
      !!extension.extensionsGlob.length;

    if (!hasGlobDefinitions) {
      return text;
    }

    // In case there are extensions as filenames entries already
    text = text !== '' ? text.replace(/\s*$/, ', ') : text;

    utils
      .combine(extension.filenamesGlob!, extension.extensionsGlob!)
      .forEach((ext, index, extensions): string =>
        populateFn(ext, index, extensions),
      );

    return text;
  }

  private getLanguageIds(extension: types.IFileExtension): string {
    let text = '';

    const populateFn = (
      langIds: string,
      index: number,
      list: string[] | types.ILanguage[],
    ): string =>
      (text += `\`${langIds}\`${index === list.length - 1 ? ' ' : ', '}`);

    if (!extension.languages || !extension.languages.length) {
      return text;
    }

    extension.languages.forEach((lang, index): void => {
      if (Array.isArray(lang.ids)) {
        lang.ids.forEach(
          (langId: string, lIndex: number, list: string[]): string =>
            populateFn(langId, lIndex, list),
        );
        return;
      }
      populateFn(lang.ids, index, extension.languages!);
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
    return new Promise((res, rej): void => {
      if (this.pargs.output === 'repo') {
        try {
          const filePath = utils.pathUnixJoin(
            this.gitClient.wikiRepoFolder,
            this.wikiPageFilename,
          );
          this.logger.log(
            `Reading wiki page from: ${filePath.replace(
              `${this.gitClient.dirname}`,
              '',
            )}`,
            this.logGroupId,
          );
          const str = fs.readFileSync(filePath).toString();
          return res(str);
        } catch (e: unknown) {
          return rej(e instanceof Error ? e : new Error(String(e)));
        }
      }

      const uri = `${this.wikiUrl}/${this.wikiPageFilename}`;

      const spinner: types.ISpinner = this.logger.spinnerLogStart(
        `Requesting wiki page from: ${uri}`,
        this.logGroupId,
      );

      const response = (resp: http.IncomingMessage): void => {
        const body: Uint8Array[] = [];
        resp
          .on('error', (err: Error): void => {
            clearInterval(spinner.timer);
            rej(new Error(err.stack ?? err.message));
          })
          .on('data', (chunk: Uint8Array): number => body.push(chunk))
          .on('end', (): void => {
            this.logger.spinnerLogStop(
              spinner,
              'Wiki page received',
              this.logGroupId,
            );
            return res(Buffer.concat(body).toString());
          });

        if (resp.statusCode !== 200) {
          return rej(
            new Error(resp.statusMessage ?? `HTTP status ${resp.statusCode}`),
          );
        }
      };
      const options: https.RequestOptions = url.parse(uri);
      https.get(options, response);
    });
  }

  private compareLists(wikiPageContent: string, createdList: string): boolean {
    if (this.pargs.output !== 'repo') {
      return false;
    }

    this.logger.updateLog(
      `Checking for changes to: '${this.repoFilename}'`,
      this.logGroupId,
    );

    const newIconsList = createdList.split(/\r\n|\n/gm);
    if (!newIconsList[newIconsList.length - 1]) {
      newIconsList.pop();
    }
    const currentIconsList =
      this.getReplaceText(wikiPageContent).split(/\r\n|\n/gm);
    if (!currentIconsList[currentIconsList.length - 1]) {
      currentIconsList.pop();
    }

    this.logger.updateLog('Comparing lists', this.logGroupId);

    const hasChanged = !newIconsList.every(
      (value, index): boolean => value === currentIconsList[index],
    );

    this.logger.updateLog(
      `${hasChanged ? 'C' : 'No c'}hanges detected to: '${this.repoFilename}'`,
      this.logGroupId,
    );

    return hasChanged;
  }
  public abstract createList(): string;
}
