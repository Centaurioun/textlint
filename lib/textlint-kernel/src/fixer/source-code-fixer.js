"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var debug = require("debug")("textlint:source-code-fixer");
var source_code_1 = require("../core/source-code");
var BOM = "\uFEFF";
/**
 * Compares items in a messages array by line and column.
 * @param {TextlintMessage} a The first message.
 * @param {TextlintMessage} b The second message.
 * @returns {int} -1 if a comes before b, 1 if a comes after b, 0 if equal.
 * @private
 */
function compareMessagesByLocation(a, b) {
    var lineDiff = a.line - b.line;
    if (lineDiff === 0) {
        return a.column - b.column;
    }
    else {
        return lineDiff;
    }
}
function clone(object) {
    return JSON.parse(JSON.stringify(object));
}
/**
 * Utility for apply fixes to source code.
 * @constructor
 */
var SourceCodeFixer = /** @class */ (function () {
    function SourceCodeFixer() {
    }
    /**
     * Applies the fixes specified by the messages to the given text. Tries to be
     * smart about the fixes and won't apply fixes over the same area in the text.
     * @param {SourceCode} sourceCode The source code to apply the changes to.
     * @param {TextlintMessage[]} messages The array of messages reported by ESLint.
     * @returns {Object} An object containing the fixed text and any unfixed messages.
     */
    SourceCodeFixer.applyFixes = function (sourceCode, messages) {
        debug("Applying fixes");
        var text = sourceCode.text;
        // As as result, show diff
        var remainingMessages = [];
        var applyingMessages = [];
        var cloneMessages = messages.slice();
        var fixes = [];
        var lastFixPos = text.length + 1;
        var prefix = sourceCode.hasBOM ? BOM : "";
        cloneMessages.forEach(function (problem) {
            if (problem && problem.fix !== undefined) {
                fixes.push(problem);
            }
            else {
                remainingMessages.push(problem);
            }
        });
        if (fixes.length) {
            debug("Found fixes to apply");
            // sort in reverse order of occurrence
            // FIXME: always has `fix`
            fixes.sort(function (a, b) {
                if (a.fix.range[1] <= b.fix.range[0]) {
                    return 1;
                }
                else {
                    return -1;
                }
            });
            // split into array of characters for easier manipulation
            var chars_1 = text.split("");
            fixes.forEach(function (problem) {
                // pickup fix range
                var fix = problem.fix;
                var start = fix.range[0];
                var end = fix.range[1];
                var insertionText = fix.text;
                if (end < lastFixPos) {
                    if (start < 0) {
                        // Remove BOM.
                        prefix = "";
                        start = 0;
                    }
                    if (start === 0 && insertionText[0] === BOM) {
                        // Set BOM.
                        prefix = BOM;
                        insertionText = insertionText.slice(1);
                    }
                    var replacedChars = chars_1.splice(start, end - start, insertionText);
                    lastFixPos = start;
                    var copyOfMessage = clone(problem);
                    copyOfMessage.fix = {
                        range: [start, start + insertionText.length],
                        text: replacedChars.join("")
                    };
                    applyingMessages.push(copyOfMessage);
                }
                else {
                    remainingMessages.push(problem);
                }
            });
            return {
                fixed: true,
                messages: cloneMessages,
                applyingMessages: applyingMessages.reverse(),
                remainingMessages: remainingMessages.sort(compareMessagesByLocation),
                output: prefix + chars_1.join("")
            };
        }
        else {
            debug("No fixes to apply");
            return {
                fixed: false,
                messages: cloneMessages,
                applyingMessages: applyingMessages,
                remainingMessages: remainingMessages,
                output: prefix + text
            };
        }
    };
    /**
     * Sequentially Applies the fixes specified by the messages to the given text.
     * @param {SourceCode} sourceCode The source code to apply the changes to.
     * @param {TextlintMessage[]} applyingMessages The array of TextLintMessage reported by SourceCodeFixer#applyFixes
     * @returns {string} An object containing the fixed text and any unfixed messages.
     */
    SourceCodeFixer.sequentiallyApplyFixes = function (sourceCode, applyingMessages) {
        debug("Restore applied fixes");
        var text = sourceCode.text;
        applyingMessages.forEach(function (message) {
            var newSource = new source_code_1.default({
                text: text,
                ast: sourceCode.ast,
                ext: sourceCode.ext,
                filePath: sourceCode.filePath
            });
            var result = SourceCodeFixer.applyFixes(newSource, [message]);
            text = result.output;
        });
        return text;
    };
    return SourceCodeFixer;
}());
exports.default = SourceCodeFixer;