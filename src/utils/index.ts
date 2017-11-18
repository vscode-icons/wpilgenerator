import * as path from 'path';

export function pathUnixJoin(...paths: string[]): string {
  return path.posix.join(...paths);
}

export function combine(array1: any[], array2: any[], separator = '.'): any[] {
  return array1.reduce((previous: string[], current: string) =>
    previous.concat(array2.map(value => [current, value].join(separator))), []);
}
