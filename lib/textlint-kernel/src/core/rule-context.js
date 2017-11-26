// LICENSE : MIT
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var assert = require("assert");
var rule_fixer_1 = require("../fixer/rule-fixer");
var rule_error_1 = require("./rule-error");
var SeverityLevel_1 = require("../shared/type/SeverityLevel");
var rule_severity_1 = require("../shared/rule-severity");
// instance for rule context
var ruleFixer = new rule_fixer_1.default();
var RuleContext = /** @class */ (function () {
    function RuleContext(args) {
        var _this = this;
        /**
         * report function that is called in a rule
         */
        this.report = function (node, ruleError, _shouldNotUsed) {
            assert(!(node instanceof rule_error_1.default), "1st argument should be node. Usage: `report(node, ruleError);`");
            assert(_shouldNotUsed === undefined, "3rd argument should not be used. Usage: `report(node, ruleError);`");
            if (ruleError instanceof rule_error_1.default) {
                // FIXME: severity is internal API
                _this._report({ ruleId: _this._ruleId, node: node, severity: _this._severity, ruleError: ruleError });
            }
            else {
                var level = ruleError.severity || SeverityLevel_1.default.error;
                _this._report({ ruleId: _this._ruleId, node: node, severity: level, ruleError: ruleError });
            }
        };
        /**
         * get file path current processing.
         */
        this.getFilePath = function () {
            return _this._sourceCode.getFilePath();
        };
        /**
         * Gets the source code for the given node.
         * @param {TxtNode=} node The AST node to get the text for.
         * @param {int=} beforeCount The number of characters before the node to retrieve.
         * @param {int=} afterCount The number of characters after the node to retrieve.
         * @returns {string|null} The text representing the AST node.
         */
        this.getSource = function (node, beforeCount, afterCount) {
            return _this._sourceCode.getSource(node, beforeCount, afterCount);
        };
        /**
         * get config base directory path
         * config base directory path often is the place of .textlintrc
         *
         * e.g.) /path/to/dir/.textlintrc
         * `getConfigBaseDir()` return `"/path/to/dir/"`.
         *
         * When using textlint as module, it is specified by `configBaseDir`
         * If not found the value, return undefined.
         *
         * You can use it for resolving relative path from config dir.
         * @returns {string|undefined}
         */
        this.getConfigBaseDir = function () {
            return _this._configBaseDir;
        };
        this._ruleId = args.ruleId;
        this._sourceCode = args.sourceCode;
        this._report = args.report;
        this._ruleOptions = args.ruleOptions;
        this._configBaseDir = args.configBaseDir;
        this._severity = rule_severity_1.getSeverity(this._ruleOptions);
    }
    Object.defineProperty(RuleContext.prototype, "id", {
        /**
         * Rule id
         * @returns {string}
         */
        get: function () {
            return this._ruleId;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RuleContext.prototype, "severity", {
        get: function () {
            return this._severity;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RuleContext.prototype, "Syntax", {
        /**
         * Node's type values
         * @type {TextLintNodeType}
         */
        get: function () {
            return this._sourceCode.getSyntax();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RuleContext.prototype, "RuleError", {
        /**
         * CustomError object
         * @type {RuleError}
         */
        get: function () {
            return rule_error_1.default;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(RuleContext.prototype, "fixer", {
        /**
         * Rule fixer command object
         * @type {RuleFixer}
         */
        get: function () {
            return ruleFixer;
        },
        enumerable: true,
        configurable: true
    });
    return RuleContext;
}());
exports.default = RuleContext;