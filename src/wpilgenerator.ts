
import { Logger } from './logger';
import { YargsParser } from './yargsParser';
import { findDirectorySync, findFileSync } from './utils';
import { IResult } from './interfaces';
import { GitClient } from './git-client';
import { FilesListGenerator } from './filesListGenerator';
import { FoldersListGenerator } from './foldersListGenerator';

export async function main(): Promise<void> {
  const logger = new Logger();

  try {
    const pargs = new YargsParser(logger).parse();
    const gitClient = new GitClient(pargs, logger);

    // Locate 'vscode-icons' root directory
    const rootDir = findDirectorySync('vscode-icons');

    // Find files and folders path
    const filesPath = findFileSync(new RegExp('src/.*/supportedExtensions.js', 'g'), rootDir);
    const foldersPath = findFileSync(new RegExp('src/.*/supportedFolders.js', 'g'), rootDir);
    const files = require(filesPath[0]).extensions;
    const folders = require(foldersPath[0]).extensions;

    // clone or open repo
    await Promise.all([gitClient.getCodeRepository(), gitClient.getWikiRepository()]);

    let results: IResult[] = [];
    switch (pargs.command) {
      case 'all':
        {
          const filesGitClient = new GitClient(pargs, logger);
          const foldersGitClient = new GitClient(pargs, logger);

          results = await Promise.all([
            new FilesListGenerator(files, pargs, filesGitClient, logger).generate(),
            new FoldersListGenerator(folders, pargs, foldersGitClient, logger).generate(),
          ]);
          results = results.filter(res => res);
          break;
        }
      case 'files':
        {
          const result = await new FilesListGenerator(files, pargs, gitClient, logger).generate();
          if (result) {
            results.push(result);
          }
          break;
        }
      case 'folders':
        {
          const result = await new FoldersListGenerator(folders, pargs, gitClient, logger).generate();
          if (result) {
            results.push(result);
          }
          break;
        }
    }

    let hasCommit: boolean;
    if (results) {
      const asyncForEach = async (array, callback): Promise<void> => {
        for (let index = 0; index < array.length; index++) {
          await callback(array[index], index, array);
        }
      };
      await asyncForEach(results, async result => {
        if (!result) { return; }
        hasCommit = await gitClient.tryCommitToWikiRepo(result.filename, result.content) || hasCommit;
      });
    }

    if (hasCommit) {
      await gitClient.tryPushToWikiRepo(results.length);
    }

    logger.log('Finished');

  } catch (e) {
    const error = e instanceof Error ? e : new Error(e);
    logger.error(error.stack);
  }
}
