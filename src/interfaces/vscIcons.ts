export interface IDefaultExtension {
  icon: string; // name of the icon.
  format?: FileFormat | string; // format of the icon
  disabled?: boolean; // user customization: if false the extension won't be exported.
}

export interface IExtension extends IDefaultExtension {
  extensions: string[]; // set of extensions associated to the icon.
  light?: boolean; // set it to true if the extension support light icons.
  overrides?: string; // user customization: disables the specified extension.
  extends?: string; // user customization: extends the specified extension.
}
export interface IExtensionCollection<T> {
  supported: T[];
}

export interface IFileCollection extends IExtensionCollection<IFileExtension> {
  default: IFileDefault;
}

export interface IFileDefault {
  file?: IDefaultExtension;
  file_light?: IDefaultExtension;
}

export interface IFileExtension extends IExtension {
  /** @interal */
  checked?: boolean;
  filename?: boolean; // set to true if the extension represents the whole file name.
  languages?: ILanguage[]; // collection of languages associated to the icon.
  filenamesGlob?: string[]; // array of file names to generate with file extensions to associate to the icon.
  extensionsGlob?: string[]; // array of file extensions to generate with file names to associate to the icon.
}
export enum FileFormat {
  svg,
  png,
}

export interface IFolderCollection extends IExtensionCollection<IFolderExtension> {
  default: IFolderDefault;
}

export interface IFolderDefault {
  folder?: IDefaultExtension;
  folder_light?: IDefaultExtension;
  root_folder?: IDefaultExtension;
  root_folder_light?: IDefaultExtension;
}

// tslint:disable-next-line no-empty-interface
export interface IFolderExtension extends IExtension {
  /** @interal */
  checked?: boolean;
}

export interface ILanguage {
  ids: string | string[];
  defaultExtension: string; // this is only used for exampleGenerator, so it can know which extension to use.
}
