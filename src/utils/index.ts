import fs from 'fs';
import path from 'path';

export function pathUnixJoin(...paths: string[]): string {
  return path.posix.join(...paths);
}

export function combine(array1: any[], array2: any[], separator = '.'): any[] {
  return array1.reduce(
    (previous: string[], current: string) =>
      previous.concat(
        array2.map((value: any) => [current, value].join(separator)),
      ),
    [],
  );
}

export function findDirectorySync(dirName: string): string {
  let dir = path.resolve();
  const root = path.parse(dir).root;
  let loop = true;
  while (loop) {
    let lookUpDir: string;
    try {
      fs.accessSync(path.resolve(dir, dirName));
      lookUpDir = dirName;
    } catch (err) {
      lookUpDir = undefined;
    }
    if (lookUpDir) {
      loop = false;
      return path.join(dir, lookUpDir);
    } else if (dir === root) {
      loop = false;
      return null;
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
