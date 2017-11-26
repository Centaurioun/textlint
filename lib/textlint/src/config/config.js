// LICENSE : MIT
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var objectAssign = require("object-assign");
var md5 = require("md5");
var fs = require("fs");
var assert = require("assert");
var pkg = require("../../package.json");
var concat = require("unique-concat");
var path = require("path");
var config_loader_1 = require("./config-loader");
var config_util_1 = require("../util/config-util");
var preset_loader_1 = require("./preset-loader");
var plugin_loader_1 = require("./plugin-loader");
var preset_loader_2 = require("./preset-loader");
var textlint_module_resolver_1 = require("../engine/textlint-module-resolver");
var separate_by_config_option_1 = require("./separate-by-config-option");
/**
 * Convert config of preset to rulesConfig flat path format.
 *
 * e.g.)
 * {
 *  "preset-a" : { "key": "value"}
 * }
 * => {"preset-a/key": "value"}
 *
 * @param rulesConfig
 * @returns {{string: string}}
 */
function convertRulesConfigToFlatPath(rulesConfig) {
    if (!rulesConfig) {
        return {};
    }
    var filteredConfig = {};
    Object.keys(rulesConfig).forEach(function (key) {
        if (config_util_1.isPresetRuleKey(key)) {
            // <preset>/<rule>
            objectAssign(filteredConfig, preset_loader_1.mapRulesConfig(rulesConfig[key], key));
            return;
        }
        filteredConfig[key] = rulesConfig[key];
    });
    return filteredConfig;
}
/**
 * @type {TextlintConfig}
 */
var defaultOptions = Object.freeze({
    // rule package names
    rules: [],
    // disabled rule package names
    // always should start with empty
    disabledRules: [],
    // rules config object
    rulesConfig: {},
    // filter rule package names
    filterRules: [],
    disabledFilterRules: [],
    // rules config object
    filterRulesConfig: {},
    // preset package names
    // e.g.) ["preset-foo"]
    presets: [],
    // plugin package names
    plugins: [],
    // plugin config
    pluginsConfig: {},
    // base directory for loading {rule, config, plugin} modules
    rulesBaseDirectory: undefined,
    // ".textlint" file path
    configFile: undefined,
    // rule directories
    rulePaths: [],
    // available extensions
    // if set the option, should filter by extension.
    extensions: [],
    // formatter file name
    // e.g.) stylish.js => set "stylish"
    // NOTE: default formatter is defined in Engine,
    // because There is difference between TextLintEngine and TextFixEngine.
    formatterName: undefined,
    // --quiet
    quiet: false,
    // --no-color
    color: true,
    // --cache : enable or disable
    cache: false,
    // --cache-location: cache file path
    cacheLocation: path.resolve(process.cwd(), ".textlintcache")
});
// Priority: CLI > Code options > config file
var Config = /** @class */ (function () {
    /**
     * initialize with options.
     * @param {TextlintConfig} options the option object is defined as TextlintConfig.
     * @returns {Config}
     * @constructor
     */
    function Config(options) {
        if (options === void 0) { options = {}; }
        /**
         * @type {string|undefined} absolute path to .textlintrc file.
         * - If using .textlintrc, return path to .textlintrc
         * - If using npm config module, return path to main file of the module
         * - If not using config file, return undefined
         */
        this.configFile = options.configFile;
        if (this.configFile) {
            assert(path.isAbsolute(this.configFile), "configFile should be absolute path: " + this.configFile);
        }
        this.rulesBaseDirectory = options.rulesBaseDirectory
            ? options.rulesBaseDirectory
            : defaultOptions.rulesBaseDirectory;
        // rule names that are defined in ,textlintrc
        var configConstructor = this.constructor;
        var moduleResolver = new textlint_module_resolver_1.TextLintModuleResolver({
            CONFIG_PACKAGE_PREFIX: configConstructor.CONFIG_PACKAGE_PREFIX,
            FILTER_RULE_NAME_PREFIX: configConstructor.FILTER_RULE_NAME_PREFIX,
            RULE_NAME_PREFIX: configConstructor.RULE_NAME_PREFIX,
            RULE_PRESET_NAME_PREFIX: configConstructor.RULE_PRESET_NAME_PREFIX,
            PLUGIN_NAME_PREFIX: configConstructor.PLUGIN_NAME_PREFIX
        }, this.rulesBaseDirectory);
        /**
         * @type {string[]} rule key list
         * but, plugins's rules are not contained in `rules`
         * plugins's rule are loaded in TextLintEngine
         */
        this.rules = options.rules ? options.rules : defaultOptions.rules;
        /**
         * @type {string[]} rule key list
         * These rule is set `false` to options
         */
        this.disabledRules = options.disabledRules ? options.disabledRules : defaultOptions.disabledRules;
        /**
         * @type {string[]} filter rule key list
         */
        this.filterRules = options.filterRules ? options.filterRules : defaultOptions.filterRules;
        /**
         * @type {string[]} rule key list
         * These rule is set `false` to options
         */
        this.disabledFilterRules = options.disabledFilterRules
            ? options.disabledFilterRules
            : defaultOptions.disabledFilterRules;
        /**
         * @type {string[]} preset key list
         */
        this.presets = options.presets ? options.presets : defaultOptions.presets;
        // => load plugins
        // this.rules has not contain plugin rules
        // =====================
        this.plugins = options.plugins ? options.plugins : defaultOptions.plugins;
        this.pluginsConfig = options.pluginsConfig ? options.pluginsConfig : defaultOptions.pluginsConfig;
        // rulesConfig
        var presetRulesConfig = preset_loader_2.loadRulesConfigFromPresets(this.presets, moduleResolver);
        this.rulesConfig = objectAssign({}, presetRulesConfig, options.rulesConfig);
        // filterRulesConfig
        this.filterRulesConfig = options.filterRulesConfig || defaultOptions.filterRulesConfig;
        /**
         * @type {string[]}
         */
        this.extensions = options.extensions ? options.extensions : defaultOptions.extensions;
        // additional availableExtensions from plugin
        var additionalExtensions = plugin_loader_1.loadAvailableExtensions(this.plugins, moduleResolver);
        this.extensions = this.extensions.concat(additionalExtensions);
        /**
         * @type {string[]}
         */
        this.rulePaths = options.rulePaths ? options.rulePaths : defaultOptions.rulePaths;
        /**
         * @type {string}
         */
        this.formatterName = options.formatterName ? options.formatterName : defaultOptions.formatterName;
        /**
         * @type {boolean}
         */
        this.quiet = options.quiet !== undefined ? options.quiet : defaultOptions.quiet;
        /**
         * @type {boolean}
         */
        this.color = options.color !== undefined ? options.color : defaultOptions.color;
        /**
         * @type {boolean}
         */
        this.cache = options.cache !== undefined ? options.cache : defaultOptions.cache;
        /**
         * @type {string}
         */
        this.cacheLocation = options.cacheLocation !== undefined ? options.cacheLocation : defaultOptions.cacheLocation;
        this._assertCacheLocation(this.cacheLocation);
    }
    Object.defineProperty(Config, "CONFIG_FILE_NAME", {
        /**
         * @return {string} rc config filename
         * it's name use as `.<name>rc`
         */
        get: function () {
            return "textlint";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Config, "CONFIG_PACKAGE_PREFIX", {
        /**
         * @return {string} config package prefix
         */
        get: function () {
            return "textlint-config-";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Config, "RULE_NAME_PREFIX", {
        /**
         * @return {string} rule package's name prefix
         */
        get: function () {
            return "textlint-rule-";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Config, "FILTER_RULE_NAME_PREFIX", {
        /**
         * @return {string} filter rule package's name prefix
         */
        get: function () {
            return "textlint-filter-rule-";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Config, "RULE_PRESET_NAME_PREFIX", {
        /**
         * @return {string} rule preset package's name prefix
         */
        get: function () {
            return "textlint-rule-preset-";
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Config, "PLUGIN_NAME_PREFIX", {
        /**
         * @return {string} plugins package's name prefix
         */
        get: function () {
            return "textlint-plugin-";
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Create config object form command line options
     * See options.js
     * @param {object} cliOptions the options is command line option object. @see options.js
     * @returns {Config}
     */
    Config.initWithCLIOptions = function (cliOptions) {
        var options = {};
        options.extensions = cliOptions.ext ? cliOptions.ext : defaultOptions.extensions;
        options.rules = cliOptions.rule ? cliOptions.rule : defaultOptions.rules;
        // TODO: CLI --filter <rule>?
        options.filterRules = defaultOptions.filterRules;
        options.disabledFilterRules = defaultOptions.disabledFilterRules;
        // TODO: CLI --disable <rule>?
        options.disabledRules = defaultOptions.disabledRules;
        options.presets = cliOptions.preset ? cliOptions.preset : defaultOptions.presets;
        options.plugins = cliOptions.plugin ? cliOptions.plugin : defaultOptions.plugins;
        options.configFile = cliOptions.config ? cliOptions.config : defaultOptions.configFile;
        options.rulePaths = cliOptions.rulesdir ? cliOptions.rulesdir : defaultOptions.rulePaths;
        options.formatterName = cliOptions.format ? cliOptions.format : defaultOptions.formatterName;
        options.quiet = cliOptions.quiet !== undefined ? cliOptions.quiet : defaultOptions.quiet;
        options.color = cliOptions.color !== undefined ? cliOptions.color : defaultOptions.color;
        // --cache
        options.cache = cliOptions.cache !== undefined ? cliOptions.cache : defaultOptions.cache;
        // --cache-location="path/to/file"
        options.cacheLocation =
            cliOptions.cacheLocation !== undefined
                ? path.resolve(process.cwd(), cliOptions.cacheLocation)
                : defaultOptions.cacheLocation;
        return this.initWithAutoLoading(options);
    };
    /* eslint-disable complexity */
    // load config and merge options.
    Config.initWithAutoLoading = function (options) {
        if (options === void 0) { options = {}; }
        // Base directory
        var rulesBaseDirectory = options.rulesBaseDirectory
            ? options.rulesBaseDirectory
            : defaultOptions.rulesBaseDirectory;
        // Create resolver
        var moduleResolver = new textlint_module_resolver_1.TextLintModuleResolver(this, rulesBaseDirectory);
        // => ConfigFile
        // configFile is optional
        // => load .textlintrc
        var loadedResult = config_loader_1.loadConfig(options.configFile, {
            moduleResolver: moduleResolver,
            configFileName: this.CONFIG_FILE_NAME
        });
        var configFileRaw = loadedResult.config;
        var configFilePath = loadedResult.filePath;
        // => Load options from .textlintrc
        var configRulesObject = separate_by_config_option_1.separateAvailableOrDisable(configFileRaw.rules);
        var configFilterRulesObject = separate_by_config_option_1.separateAvailableOrDisable(configFileRaw.filters);
        var configPresets = configRulesObject.presets;
        var configFilePlugins = plugin_loader_1.getPluginNames(configFileRaw);
        var configFilePluginConfig = plugin_loader_1.getPluginConfig(configFileRaw);
        var configFileRulesConfig = convertRulesConfigToFlatPath(configFileRaw.rules);
        var configFileFilterRulesConfig = convertRulesConfigToFlatPath(configFileRaw.filters);
        // => User specified Options
        var optionRules = options.rules || [];
        var optionFilterRules = options.filterRules || [];
        var optionDisabledRules = options.disabledRules || [];
        var optionDisabledFilterRules = options.disabledFilterRules || [];
        var optionRulesConfig = options.rulesConfig || {};
        var optionFilterRulesConfig = options.filterRulesConfig || {};
        var optionPlugins = options.plugins || [];
        var optionPresets = options.presets || [];
        var optionPluginsConfig = options.pluginsConfig || {};
        // => Merge options and configFileOptions
        // Priority options > configFile
        var rules = concat(optionRules, configRulesObject.available);
        var disabledRules = concat(optionDisabledRules, configRulesObject.disable);
        var filterRules = concat(optionFilterRules, configFilterRulesObject.available);
        var disabledFilterRules = concat(optionDisabledFilterRules, configFilterRulesObject.disable);
        var rulesConfig = objectAssign({}, configFileRulesConfig, optionRulesConfig);
        var filterRulesConfig = objectAssign({}, configFileFilterRulesConfig, optionFilterRulesConfig);
        var plugins = concat(optionPlugins, configFilePlugins);
        var pluginsConfig = objectAssign({}, configFilePluginConfig, optionPluginsConfig);
        var presets = concat(optionPresets, configPresets);
        var mergedOptions = objectAssign({}, options, {
            rules: rules,
            disabledRules: disabledRules,
            rulesConfig: rulesConfig,
            filterRules: filterRules,
            disabledFilterRules: disabledFilterRules,
            filterRulesConfig: filterRulesConfig,
            plugins: plugins,
            pluginsConfig: pluginsConfig,
            presets: presets,
            configFile: configFilePath
        });
        return new this(mergedOptions);
    };
    Object.defineProperty(Config.prototype, "hash", {
        /**
         * Return hash string of the config and textlint version
         * @returns {string}
         */
        get: function () {
            var version = pkg.version;
            var toString = JSON.stringify(this.toJSON());
            return md5(version + "-" + toString);
        },
        enumerable: true,
        configurable: true
    });
    Config.prototype._assertCacheLocation = function (locationPath) {
        var fileStats;
        try {
            fileStats = fs.lstatSync(locationPath);
        }
        catch (ex) {
            fileStats = null;
        }
        if (!fileStats) {
            return;
        }
        // TODO: --cache-location not supported directory
        // We should defined what is default name.
        assert(!fileStats.isDirectory(), "--cache-location doesn't support directory");
    };
    /* eslint-enable complexity */
    Config.prototype.toJSON = function () {
        var _this = this;
        var r = Object.create(null);
        Object.keys(this).forEach(function (key) {
            if (!_this.hasOwnProperty(key)) {
                return;
            }
            var value = _this[key];
            if (value == null) {
                return;
            }
            r[key] = typeof value.toJSON !== "undefined" ? value.toJSON() : value;
        });
        return r;
    };
    return Config;
}());
exports.Config = Config;