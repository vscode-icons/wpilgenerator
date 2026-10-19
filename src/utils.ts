import fs from 'fs';
import path from 'path';

export function pathUnixJoin(...paths: string[]): string {
  return path.posix.join(...paths);
}

export function combine(
  array1: string[],
  array2: string[],
  separator = '.',
): string[] {
  return array1.reduce(
    (previous: string[], current: string): string[] =>
      previous.concat(
        array2.map((value: string): string => [current, value].join(separator)),
      ),
    [],
  );
}

export function findDirectorySync(dirName: string): string {
  let dir = path.resolve();
  const root = path.parse(dir).root;
  while (true) {
    let lookupDir: string | undefined;
    try {
      fs.accessSync(path.resolve(dir, dirName));
      lookupDir = dirName;
    } catch {
      lookupDir = undefined;
    }
    if (lookupDir) {
      return path.join(dir, lookupDir);
    } else if (dir === root) {
      return dir;
    }
    dir = path.dirname(dir);
  }
}

export function findFileSync(
  filePath: string | RegExp,
  rootPath?: string,
  results?: string[],
): string[] {
  if (!rootPath) {
    rootPath = path.resolve();
  }
  if (!results) {
    results = [];
  }
  const files = fs.readdirSync(rootPath);
  for (const file of files) {
    const filename = path.join(rootPath, file);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      findFileSync(filePath, filename, results);
    }
    if (filePath instanceof RegExp) {
      if (filePath.test(filename)) {
        results.push(filename);
      }
      continue;
    }
    if (filename.includes(filePath)) {
      results.push(filename);
    }
  }
  return results;
}
