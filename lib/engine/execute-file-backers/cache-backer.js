// MIT © 2016 azu
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fileEntryCache = require("file-entry-cache");
var debug = require("debug")("CacheBacker");
var CacheBacker = /** @class */ (function () {
    /**
     * @param {Config} config
     */
    function CacheBacker(config) {
        /**
         * @type {boolean}
         */
        this.isEnabled = config.cache;
        this.fileCache = fileEntryCache.create(config.cacheLocation);
        /**
         * @type {string}
         */
        this.hashOfConfig = config.hash;
    }
    /**
     * @param {string} filePath
     * @returns {boolean}
     */
    CacheBacker.prototype.shouldExecute = function (_a) {
        var filePath = _a.filePath;
        if (!this.isEnabled) {
            return true;
        }
        var descriptor = this.fileCache.getFileDescriptor(filePath);
        var meta = descriptor.meta || {};
        // if the config is changed or file is changed, should execute return true
        var isNotChanged = descriptor.changed || meta.hashOfConfig !== this.hashOfConfig;
        debug("Skipping file since hasn't changed: " + filePath);
        return isNotChanged;
    };
    /**
     * @param {TextlintResult} result
     */
    CacheBacker.prototype.didExecute = function (_a) {
        var result = _a.result;
        if (!this.isEnabled) {
            return;
        }
        var filePath = result.filePath;
        var descriptor = this.fileCache.getFileDescriptor(filePath);
        var meta = descriptor.meta || {};
        /*
         * if a file contains messages we don't want to store the file in the cache
         * so we can guarantee that next execution will also operate on this file
         */
        if (result.messages.length > 0) {
            debug("File has problems, skipping it: " + filePath);
            // remove the entry from the cache
            this.fileCache.removeEntry(filePath);
        }
        else {
            // cache `config.hash`
            meta.hashOfConfig = this.hashOfConfig;
        }
    };
    /**
     * destroy all cache
     */
    CacheBacker.prototype.destroyCache = function () {
        this.fileCache.destroy();
    };
    CacheBacker.prototype.afterAll = function () {
        // persist cache
        this.fileCache.reconcile();
    };
    return CacheBacker;
}());
exports.CacheBacker = CacheBacker;