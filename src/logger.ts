import readline from 'readline';
import { ISpinner } from './interfaces';

export class Logger {

  private frames = ['- ', '\\ ', '| ', '/ '];
  private countLines = 1;

  public log(message: string, groupId?: string): void {
    process.stdout.write(`${this.getHeader(groupId)}${message}\n`);
    this.countLines++;
  }

  public error(message: string, groupId?: string): void {
    process.stderr.write(`${this.getHeader(groupId)}${message}\n`);
    this.countLines++;
  }

  public updateLog(message: string, groupId?: string): void;
  public updateLog(message: string, line: number, groupId?: string): void;
  public updateLog(message: string, lineOrGroupId?: number | string, groupId?: string): void {
    const line = (typeof lineOrGroupId === 'number' && !Number.isNaN(lineOrGroupId)) ? lineOrGroupId : 1;
    groupId = (typeof lineOrGroupId === 'string' && Number.isNaN(Number.parseInt(lineOrGroupId)))
      ? lineOrGroupId
      : groupId;

    if (!process.stdout.isTTY) {
      process.stdout.write(`${this.getHeader(groupId)}${message}\n`);
      return;
    }
    (readline as any).cursorTo(process.stdout, 0);
    readline.moveCursor(process.stdout, 0, -line);
    readline.clearLine(process.stdout, 0);
    process.stdout.write(`${this.getHeader(groupId)}${message}`);
    (readline as any).cursorTo(process.stdout, 0);
    readline.moveCursor(process.stdout, 0, line);
  }

  public spinnerLogStart(message: string, groupId?: string): ISpinner {
    const line = this.countLines;
    this.log(message, groupId);
    return { timer: this.spin(message, groupId, line), line };
  }

  public spinnerLogStop(spinner: ISpinner, message?: string, groupId?: string): void {
    clearInterval(spinner.timer);
    this.updateLog(message, this.countLines - spinner.line, groupId);
    if (!process.stdout.isTTY) { return; }
    this.cursorShow();
  }

  private spin(message: string, groupId?: string, line?: number): NodeJS.Timer {
    if (!process.stdout.isTTY) { return; }
    let i = 0;
    this.cursorHide();
    return setInterval(() => {
      const frame = this.frames[i = ++i % this.frames.length];
      this.updateLog(`${this.getHeader(groupId)}${frame}${message}`, this.countLines - line);
    }, 80);
  }

  private cursorShow(): void {
    process.stdout.write('\u001B[?25h');
  }

  private cursorHide(): void {
    process.stdout.write('\u001B[?25l');
  }

  private getHeader(groupId: string): string {
    return groupId ? `[${groupId}]: ` : '';
  }
}
