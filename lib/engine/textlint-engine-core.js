// LICENSE : MIT
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var createFormatter = require("textlint-formatter");
var path = require("path");
var debug = require("debug")("textlint:engine-core");
var textlint_core_1 = require("./../textlint-core");
var rule_map_1 = require("./rule-map");
var processor_map_1 = require("./processor-map");
var config_1 = require("../config/config");
var find_util_1 = require("../util/find-util");
var textlint_module_loader_1 = require("./textlint-module-loader");
var execute_file_backer_manager_1 = require("./execute-file-backer-manager");
var cache_backer_1 = require("./execute-file-backers/cache-backer");
var SeverityLevel_1 = require("../shared/type/SeverityLevel");
/**
 * Core of TextLintEngine.
 * It is internal user.
 *
 * Hackable adaptor
 *
 * - executeOnFiles
 * - executeOnText
 * - formatResults
 *
 * There are hackable by `executor` option.
 */
var TextLintEngineCore = /** @class */ (function () {
    /**
     * Process files are wanted to lint.
     * TextLintEngine is a wrapper of textlint.js.
     * Aim to be called from cli with cli options.
     * @param {Config|Object} [options] the options is command line options or Config object.
     * @param {{ onFile: Function, onText: Function, onFormat:Function }} [executor] executor are injectable function.
     * @constructor
     */
    function TextLintEngineCore(options, executor) {
        var _this = this;
        /**
         * @type {Config}
         */
        if (options instanceof config_1.Config) {
            // Almost internal use-case
            this.config = options;
        }
        else {
            this.config = config_1.Config.initWithAutoLoading(options);
        }
        /**
         * @type {TextLintCore}
         * @private
         */
        this.textlint = new textlint_core_1.TextLintCore(this.config);
        /**
         * @type {{
         *  onFile: function(textlint: TextlintCore):Function,
         *  onText: function(textlint: TextlintCore):Function,
         *  onFormat:Function}}
         */
        this.executor = executor;
        /**
         * @type {ExecuteFileBackerManager}
         * @private
         */
        this.executeFileBackerManger = new execute_file_backer_manager_1.ExecuteFileBackerManager();
        var cacheBaker = new cache_backer_1.CacheBacker(this.config);
        if (this.config.cache) {
            this.executeFileBackerManger.add(cacheBaker);
        }
        else {
            cacheBaker.destroyCache();
        }
        /**
         * @type {RuleMap} ruleMap is used for linting/fixer
         * @private
         */
        this.ruleMap = new rule_map_1.RuleMap();
        /**
         * @type {RuleMap} filerRuleMap is used for filtering
         * @private
         */
        this.filterRuleMap = new rule_map_1.RuleMap();
        /**
         * @type {PluginMap}
         * @private
         */
        this.pluginMap = new processor_map_1.PluginMap();
        /**
         * @type {TextLintModuleLoader}
         * @private
         */
        this.moduleLoader = new textlint_module_loader_1.TextLintModuleLoader(this.config);
        this.moduleLoader.on(textlint_module_loader_1.TextLintModuleLoader.Event.rule, function (_a) {
            var ruleName = _a[0], ruleCreator = _a[1];
            _this.ruleMap.defineRule(ruleName, ruleCreator);
        });
        this.moduleLoader.on(textlint_module_loader_1.TextLintModuleLoader.Event.filterRule, function (_a) {
            var ruleName = _a[0], ruleCreator = _a[1];
            _this.filterRuleMap.defineRule(ruleName, ruleCreator);
        });
        this.moduleLoader.on(textlint_module_loader_1.TextLintModuleLoader.Event.plugin, function (_a) {
            var pluginName = _a[0], plugin = _a[1];
            _this.pluginMap.set(pluginName, plugin);
        });
        // load rule/plugin/processor
        this.moduleLoader.loadFromConfig(this.config);
        // set settings to textlint core
        this._setupRules();
    }
    /**
     * @deprecated remove this method
     */
    TextLintEngineCore.prototype.setRulesBaseDirectory = function () {
        throw new Error("Should not use setRulesBaseDirectory(), insteadof use         \nnew TextLintEngine({\n rulesBaseDirectory: directory\n})\n        ");
    };
    /**
     * load plugin manually
     * Note: it high cost, please use config
     * @param {string} pluginName
     * @deprecated use Constructor(config) insteadof it
     */
    TextLintEngineCore.prototype.loadPlugin = function (pluginName) {
        this.moduleLoader.loadPlugin(pluginName);
        this._setupRules();
    };
    /**
     * load plugin manually
     * Note: it high cost, please use config
     * @param {string} presetName
     * @deprecated use Constructor(config) insteadof it
     */
    TextLintEngineCore.prototype.loadPreset = function (presetName) {
        this.moduleLoader.loadPreset(presetName);
        this._setupRules();
    };
    /**
     * load rule manually
     * Note: it high cost, please use config
     * @param {string} ruleName
     * @deprecated use Constructor(config) insteadof it
     */
    TextLintEngineCore.prototype.loadRule = function (ruleName) {
        this.moduleLoader.loadRule(ruleName);
        this._setupRules();
    };
    /**
     * load filter rule manually
     * Note: it high cost, please use config
     * @param {string} ruleName
     * @deprecated use Constructor(config) insteadof it
     */
    TextLintEngineCore.prototype.loadFilerRule = function (ruleName) {
        this.moduleLoader.loadFilterRule(ruleName);
        this._setupRules();
    };
    /**
     * Update rules from current config
     * @private
     */
    TextLintEngineCore.prototype._setupRules = function () {
        // set Rules
        var textlintConfig = this.config ? this.config.toJSON() : {};
        this.textlint.setupRules(this.ruleMap.getAllRules(), textlintConfig.rulesConfig);
        this.textlint.setupFilterRules(this.filterRuleMap.getAllRules(), textlintConfig.filterRulesConfig);
        // set Processor
        this.textlint.setupPlugins(this.pluginMap.toJSON(), textlintConfig.pluginsConfig);
        // execute files that are filtered by availableExtensions.
        // TODO: it very hackable way, should be fixed
        // it is depend on textlintCore's state
        this.availableExtensions = this.textlint.pluginCreatorSet.availableExtensions.concat(this.config.extensions);
    };
    /**
     * Remove all registered rule and clear messages.
     * @private
     */
    TextLintEngineCore.prototype.resetRules = function () {
        this.textlint.resetRules();
        this.ruleMap.resetRules();
        this.filerRuleMap.resetRules();
    };
    /**
     * Executes the current configuration on an array of file and directory names.
     * @param {String[]}  files An array of file and directory names.
     * @returns {Promise<TextlintResult[]>} The results for all files that were linted.
     */
    TextLintEngineCore.prototype.executeOnFiles = function (files) {
        var _this = this;
        var boundLintFile = function (file) {
            return _this.textlint.lintFile(file);
        };
        var execFile = typeof this.executor.onFile === "function" ? this.executor.onFile(this.textlint) : boundLintFile;
        var patterns = find_util_1.pathsToGlobPatterns(files, {
            extensions: this.availableExtensions
        });
        var targetFiles = find_util_1.findFiles(patterns);
        // Maybe, unAvailableFilePath should be warning.
        // But, The user can use glob pattern like `src/**/*` as arguments.
        // pathsToGlobPatterns not modified that pattern.
        // So, unAvailableFilePath should be ignored silently.
        var _a = find_util_1.separateByAvailability(targetFiles, {
            extensions: this.availableExtensions
        }), availableFiles = _a.availableFiles, unAvailableFiles = _a.unAvailableFiles;
        debug("Process files", availableFiles);
        debug("Not Process files", unAvailableFiles);
        return this.executeFileBackerManger.process(availableFiles, execFile);
    };
    /**
     * If want to lint a text, use it.
     * But, if you have a target file, use {@link executeOnFiles} instead of it.
     * @param {string} text linting text content
     * @param {string} ext ext is a type for linting. default: ".txt"
     * @returns {Promise<TextlintResult[]>}
     */
    TextLintEngineCore.prototype.executeOnText = function (text, ext) {
        var _this = this;
        if (ext === void 0) { ext = ".txt"; }
        var boundLintText = function (file, ext) {
            return _this.textlint.lintText(file, ext);
        };
        var textlint = this.textlint;
        var execText = typeof this.executor.onText === "function" ? this.executor.onText(textlint) : boundLintText;
        // filePath or ext
        var actualExt = ext[0] === "." ? ext : path.extname(ext);
        if (actualExt.length === 0) {
            throw new Error("should specify the extension.\nex) .md");
        }
        return execText(text, actualExt).then(function (result) {
            return [result];
        });
    };
    /**
     * format {@link results} and return output text.
     * @param {TextlintResult[]} results the collection of result
     * @returns {string} formatted output text
     * @example
     *  console.log(formatResults(results));
     */
    TextLintEngineCore.prototype.formatResults = function (results) {
        var formatterConfig = {
            formatterName: this.config.formatterName,
            color: this.config.color
        };
        var formatter = typeof this.executor.onFormat === "function"
            ? this.executor.onFormat(formatterConfig)
            : createFormatter(formatterConfig);
        return formatter(results);
    };
    /**
     * Checks if the given message is an error message.
     * @param {TextlintMessage} message The message to check.
     * @returns {boolean} Whether or not the message is an error message.
     */
    TextLintEngineCore.prototype.isErrorMessage = function (message) {
        return message.severity === SeverityLevel_1.SeverityLevel.error;
    };
    /**
     * Checks if the given results contain error message.
     * If there is even one error then return true.
     * @param {TextlintResult[]} results Linting result collection
     * @returns {Boolean} Whether or not the results contain error message.
     */
    TextLintEngineCore.prototype.isErrorResults = function (results) {
        var _this = this;
        return results.some(function (result) {
            return result.messages.some(_this.isErrorMessage);
        });
    };
    /**
     * @returns {boolean}
     */
    TextLintEngineCore.prototype.hasRuleAtLeastOne = function () {
        return this.ruleMap.hasRuleAtLeastOne();
    };
    return TextLintEngineCore;
}());
exports.TextLintEngineCore = TextLintEngineCore;