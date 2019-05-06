"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
class FoldersListGenerator extends base_1.BaseGenerator {
    constructor(folders, pargs, gitClient, logger) {
        super('ListOfFolders.md', 'supportedFolders.ts', pargs, gitClient, logger, 'folders');
        this.folders = folders;
    }
    createList() {
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
        let mdText = this.getHeaders(listHeaders);
        mdText += this.getName(this.folders.default.folder);
        mdText += this.getExtensions(this.folders.default.folder);
        mdText += this.getDarkThemeImages(this.folders.default.folder, this.defaultPrefix, true);
        mdText += this.getLightThemeImages(this.folders.default.folder, this.defaultPrefix, true);
        mdText += this.getLineEnd([], -1);
        if (this.folders.default.folder_light) {
            mdText += this.getName(this.folders.default.folder_light);
            mdText += this.getExtensions(this.folders.default.folder_light);
            mdText += this.getDarkThemeImages(this.folders.default.folder_light, this.defaultPrefix, true);
            mdText += this.getLightThemeImages(this.folders.default.folder_light, this.defaultPrefix, true, true);
            mdText += this.getLineEnd([], -1);
        }
        mdText += this.getName(this.folders.default.root_folder);
        mdText += this.getExtensions(this.folders.default.root_folder);
        mdText += this.getDarkThemeImages(this.folders.default.root_folder, this.defaultPrefix, true);
        mdText += this.getLightThemeImages(this.folders.default.root_folder, this.defaultPrefix, true);
        mdText += this.getLineEnd([], -1);
        if (this.folders.default.root_folder_light) {
            mdText += this.getName(this.folders.default.root_folder_light);
            mdText += this.getExtensions(this.folders.default.root_folder_light);
            mdText += this.getDarkThemeImages(this.folders.default.root_folder_light, this.defaultPrefix, true);
            mdText += this.getLightThemeImages(this.folders.default.root_folder_light, this.defaultPrefix, true, true);
            mdText += this.getLineEnd([], -1);
        }
        this.folders.supported
            .forEach(folder => {
            mdText += this.getName(folder);
            mdText += this.getExtensions(folder);
            mdText += this.getDarkThemeImages(folder, darkThemePrefix, true);
            mdText += this.getLightThemeImages(folder, lightThemePrefix, true);
            mdText += this.getLineEnd([], -1);
        });
        this.logger.updateLog('Finished list created', this.logGroupId);
        return mdText;
    }
}
exports.FoldersListGenerator = FoldersListGenerator;
