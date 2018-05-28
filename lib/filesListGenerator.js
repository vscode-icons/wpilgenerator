"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./base");
class FilesListGenerator extends base_1.BaseGenerator {
    constructor(files, pargs, gitClient, logger) {
        super('ListOfFiles.md', 'supportedExtensions.ts', Object.assign({}, pargs, { useSmallFonts: true }), gitClient, logger, 'files');
        this.files = files;
    }
    createList() {
        const darkThemePrefix = 'file_type_';
        const lightThemePrefix = `${darkThemePrefix}light_`;
        const listHeaders = [
            'Name',
            'Extensions / Filenames / Language IDs',
            'Preview Dark Theme',
            'Preview Light Theme',
        ];
        this.logger.log('Starting list creation', this.logGroupId);
        // Headers and Separator
        let mdText = this.getHeaders(listHeaders);
        // Default File Dark Theme
        mdText += this.getName(this.files.default.file);
        mdText += this.getExtensions(this.files.default.file);
        mdText += this.getDarkThemeImages(this.files.default.file);
        mdText += this.getLightThemeImages(this.files.default.file_light);
        mdText += this.getLineEnd([], -1);
        // Default File Light Theme
        if (this.files.default.file_light) {
            mdText += this.getName(this.files.default.file_light);
            mdText += this.getExtensions(this.files.default.file_light);
            mdText += this.getDarkThemeImages(this.files.default.file_light);
            mdText += this.getLightThemeImages(this.files.default.file_light, this.defaultPrefix, /*isFolder*/ false, /*hasLightImage*/ true);
            mdText += this.getLineEnd([], -1);
        }
        // Supported Files
        this.files.supported
            .forEach(file => {
            mdText += this.getName(file);
            mdText += this.getExtensions(file);
            mdText += this.getDarkThemeImages(file, darkThemePrefix);
            mdText += this.getLightThemeImages(file, lightThemePrefix, /*isFolder*/ false, /*hasLightImage*/ file.light);
            mdText += this.getLineEnd([], -1);
        });
        this.logger.updateLog('Finished list created', this.logGroupId);
        return mdText;
    }
}
exports.FilesListGenerator = FilesListGenerator;
