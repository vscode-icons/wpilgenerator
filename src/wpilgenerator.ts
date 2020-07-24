import { FilesListGenerator } from './filesListGenerator';
import { FoldersListGenerator } from './foldersListGenerator';
import { GitClient } from './git-client';
import { IResult } from './interfaces';
import { Logger } from './logger';
import { findDirectorySync, findFileSync } from './utils';
import { YargsParser } from './yargsParser';
import { IFileCollection, IFolderCollection } from './models';

export async function main(): Promise<void> {
  const logger = new Logger();

  try {
    const pargs = new YargsParser(logger).parse();
    const gitClient = new GitClient(pargs, logger);

    // Locate 'vscode-icons' root directory
    const rootDir = findDirectorySync('vscode-icons');

    if (!rootDir) {
      throw Error(
        `Directory 'vscode-icons' could not be found, ` +
          `try cloning the repository first, in the parent directory.`,
      );
    }

    // Find files and folders path
    const baseRegex =
      'src(?:(?:\\/|\\\\)[a-zA-Z0-9\\s_@-^!#$%&+={}\\[\\]]+)*(?:\\/|\\\\)';
    const extensionsRegex = new RegExp(`${baseRegex}supportedExtensions\\.js`);
    const filesPath = findFileSync(extensionsRegex, rootDir)[0];
    const foldersRegex = new RegExp(`${baseRegex}supportedFolders\\.js`);
    const foldersPath = findFileSync(foldersRegex, rootDir)[0];

    if (!filesPath || !foldersPath) {
      throw Error(
        `Looks like 'vscode-icons' has not been build yet, ` +
          `try performing a build first.`,
      );
    }

    const files: IFileCollection = ((await import(filesPath)) as Record<
      string,
      IFileCollection
    >).extensions;
    const folders: IFolderCollection = ((await import(foldersPath)) as Record<
      string,
      IFolderCollection
    >).extensions;

    // clone or open repo
    await Promise.all([
      gitClient.getCodeRepository(),
      gitClient.getWikiRepository(),
    ]);

    let results: IResult[] = [];
    switch (pargs.command) {
      case 'all': {
        results = await Promise.all([
          new FilesListGenerator(files, pargs, gitClient, logger).generate(),
          new FoldersListGenerator(
            folders,
            pargs,
            gitClient,
            logger,
          ).generate(),
        ]);
        results = results.filter((res: IResult) => res);
        break;
      }
      case 'files': {
        const result = await new FilesListGenerator(
          files,
          pargs,
          gitClient,
          logger,
        ).generate();
        if (result) {
          results.push(result);
        }
        break;
      }
      case 'folders': {
        const result = await new FoldersListGenerator(
          folders,
          pargs,
          gitClient,
          logger,
        ).generate();
        if (result) {
          results.push(result);
        }
        break;
      }
    }

    let hasCommit: boolean;
    if (results) {
      for (const result of results) {
        hasCommit =
          (await gitClient.tryCommitToWikiRepo(
            result.filename,
            result.content,
          )) || hasCommit;
      }
    }

    if (hasCommit) {
      await gitClient.tryPushToWikiRepo(results.length);
    }

    logger.log('Finished');
  } catch (e) {
    const error = e instanceof Error ? e : new Error(e);
    logger.error(error.stack);
    process.exit(1);
  }
}
