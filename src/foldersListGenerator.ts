import { BaseGenerator } from './base';
import { GitClient } from './git-client';
import { IParsedArgs } from './interfaces';
import { Logger } from './logger';
import { IExtension, IFolderCollection, IFolderExtension } from './models';

export class FoldersListGenerator extends BaseGenerator {
  constructor(
    private folders: IFolderCollection,
    pargs: IParsedArgs,
    gitClient: GitClient,
    logger: Logger,
  ) {
    super(
      'ListOfFolders.md',
      'supportedFolders.ts',
      pargs,
      gitClient,
      logger,
      'folders',
    );
  }

  public createList(): string {
    const darkThemePrefix = 'folder_type_';
    const lightThemePrefix = `${darkThemePrefix}light_`;

    const listHeaders = [
      'Name',
      'Folder Name',
      'Preview Closed Dark Theme',
      'Preview Opened Dark Theme',
      'Preview Closed Light Theme',
      'Preview Opened Light Theme',
    ];

    this.logger.log('Starting list creation', this.logGroupId);

    // Headers and Separator
    let mdText = this.getHeaders(listHeaders);

    // Default Folder Dark Theme
    mdText += this.getName(this.folders.default.folder);
    mdText += this.getExtensions(this.folders.default.folder as IExtension);
    mdText += this.getDarkThemeImages(
      this.folders.default.folder,
      this.defaultPrefix,
      /* isFolder */ true,
    );
    mdText += this.getLightThemeImages(
      this.folders.default.folder as IExtension,
      this.defaultPrefix,
      /* isFolder */ true,
    );
    mdText += this.getLineEnd([], -1);

    // Default Folder Light Theme
    if (this.folders.default.folder_light) {
      mdText += this.getName(this.folders.default.folder_light);
      mdText += this.getExtensions(
        this.folders.default.folder_light as IExtension,
      );
      mdText += this.getDarkThemeImages(
        this.folders.default.folder_light,
        this.defaultPrefix,
        /* isFolder */ true,
      );
      mdText += this.getLightThemeImages(
        this.folders.default.folder_light as IExtension,
        this.defaultPrefix,
        /* isFolder */ true,
        /* hasLightImage */ true,
      );
      mdText += this.getLineEnd([], -1);
    }

    // Default Root Folder Dark Theme
    mdText += this.getName(this.folders.default.root_folder);
    mdText += this.getExtensions(
      this.folders.default.root_folder as IExtension,
    );
    mdText += this.getDarkThemeImages(
      this.folders.default.root_folder,
      this.defaultPrefix,
      /* isFolder */ true,
    );
    mdText += this.getLightThemeImages(
      this.folders.default.root_folder as IExtension,
      this.defaultPrefix,
      /* isFolder */ true,
    );
    mdText += this.getLineEnd([], -1);

    // Default Root Folder Light Theme
    if (this.folders.default.root_folder_light) {
      mdText += this.getName(this.folders.default.root_folder_light);
      mdText += this.getExtensions(
        this.folders.default.root_folder_light as IExtension,
      );
      mdText += this.getDarkThemeImages(
        this.folders.default.root_folder_light,
        this.defaultPrefix,
        /* isFolder */ true,
      );
      mdText += this.getLightThemeImages(
        this.folders.default.root_folder_light as IExtension,
        this.defaultPrefix,
        /* isFolder */ true,
        /* hasLightImage */ true,
      );
      mdText += this.getLineEnd([], -1);
    }

    // Supported Folders
    this.folders.supported.forEach((folder: IFolderExtension) => {
      mdText += this.getName(folder);
      mdText += this.getExtensions(folder);
      mdText += this.getDarkThemeImages(
        folder,
        darkThemePrefix,
        /* isFolder */ true,
      );
      mdText += this.getLightThemeImages(
        folder,
        lightThemePrefix,
        /* isFolder */ true,
      );
      mdText += this.getLineEnd([], -1);
    });

    this.logger.updateLog('Finished list created', this.logGroupId);

    return mdText;
  }
}
