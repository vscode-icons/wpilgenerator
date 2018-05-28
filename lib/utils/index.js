"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function pathUnixJoin(...paths) {
    return path_1.default.posix.join(...paths);
}
exports.pathUnixJoin = pathUnixJoin;
function combine(array1, array2, separator = '.') {
    return array1.reduce((previous, current) => previous.concat(array2.map(value => [current, value].join(separator))), []);
}
exports.combine = combine;
function findDirectorySync(dirName) {
    let dir = path_1.default.resolve();
    const root = path_1.default.parse(dir).root;
    while (true) {
        let lookUpDir;
        try {
            fs_1.default.accessSync(path_1.default.resolve(dir, dirName));
            lookUpDir = dirName;
        }
        catch (err) {
            lookUpDir = undefined;
        }
        if (lookUpDir) {
            return path_1.default.join(dir, lookUpDir);
        }
        else if (dir === root) {
            return null;
        }
        dir = path_1.default.dirname(dir);
    }
}
exports.findDirectorySync = findDirectorySync;
function findFileSync(filePath, rootPath, results) {
    if (!rootPath) {
        rootPath = path_1.default.resolve();
    }
    if (!results) {
        results = [];
    }
    const files = fs_1.default.readdirSync(rootPath);
    for (const file of files) {
        const filename = path_1.default.join(rootPath, file);
        const stat = fs_1.default.lstatSync(filename);
        if (stat.isDirectory()) {
            findFileSync(filePath, filename, results);
        }
        if (filePath instanceof RegExp) {
            if (filePath.test(filename)) {
                results.push(filename);
            }
            continue;
        }
        if (filename.indexOf(filePath) > -1) {
            results.push(filename);
        }
    }
    return results;
}
exports.findFileSync = findFileSync;
