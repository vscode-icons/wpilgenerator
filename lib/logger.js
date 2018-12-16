"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = __importDefault(require("readline"));
class Logger {
    constructor() {
        this.frames = ['- ', '\\ ', '| ', '/ '];
        this.countLines = 1;
    }
    log(message, groupId) {
        process.stdout.write(`${this.getHeader(groupId)}${message}\n`);
        this.countLines++;
    }
    error(message, groupId) {
        process.stderr.write(`${this.getHeader(groupId)}${message}\n`);
        this.countLines++;
    }
    updateLog(message, lineOrGroupId, groupId) {
        const line = (typeof lineOrGroupId === 'number' && !Number.isNaN(lineOrGroupId)) ? lineOrGroupId : 1;
        groupId = (typeof lineOrGroupId === 'string' && Number.isNaN(Number.parseInt(lineOrGroupId, 10)))
            ? lineOrGroupId
            : groupId;
        if (!process.stdout.isTTY) {
            process.stdout.write(`${this.getHeader(groupId)}${message}\n`);
            return;
        }
        readline_1.default.cursorTo(process.stdout, 0);
        readline_1.default.moveCursor(process.stdout, 0, -line);
        readline_1.default.clearLine(process.stdout, 0);
        process.stdout.write(`${this.getHeader(groupId)}${message}`);
        readline_1.default.cursorTo(process.stdout, 0);
        readline_1.default.moveCursor(process.stdout, 0, line);
    }
    spinnerLogStart(message, groupId) {
        const line = this.countLines;
        this.log(message, groupId);
        return { timer: this.spin(message, groupId, line), line };
    }
    spinnerLogStop(spinner, message, groupId) {
        clearInterval(spinner.timer);
        this.updateLog(message, this.countLines - spinner.line, groupId);
        if (!process.stdout.isTTY) {
            return;
        }
        this.cursorShow();
    }
    spin(message, groupId, line) {
        if (!process.stdout.isTTY) {
            return;
        }
        let i = 0;
        this.cursorHide();
        return setInterval(() => {
            const frame = this.frames[i = ++i % this.frames.length];
            this.updateLog(`${this.getHeader(groupId)}${frame}${message}`, this.countLines - line);
        }, 80);
    }
    cursorShow() {
        process.stdout.write('\u001B[?25h');
    }
    cursorHide() {
        process.stdout.write('\u001B[?25l');
    }
    getHeader(groupId) {
        return groupId ? `[${groupId}]: ` : '';
    }
}
exports.Logger = Logger;
