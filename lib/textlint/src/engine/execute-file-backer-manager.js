// MIT © 2016 azu
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Promise = require("bluebird");
var ExecuteFileBackerManager = /** @class */ (function () {
    /**
     * create MessageProcessManager with backers
     * @param {AbstractBacker[]} backers
     */
    function ExecuteFileBackerManager(backers) {
        if (backers === void 0) { backers = []; }
        this._backers = backers;
    }
    /**
     * @param {AbstractBacker} backer
     */
    ExecuteFileBackerManager.prototype.add = function (backer) {
        this._backers.push(backer);
    };
    /**
     * @param {AbstractBacker} backer
     */
    ExecuteFileBackerManager.prototype.remove = function (backer) {
        var index = this._backers.indexOf(backer);
        if (index !== -1) {
            this._backers.splice(index, 1);
        }
    };
    /**
     * process `messages` with registered processes
     * @param {string[]} files
     * @returns {Promise.<TextlintResult[]>}
     */
    ExecuteFileBackerManager.prototype.process = function (files, executeFile) {
        var _this = this;
        var unExecutedResults = [];
        var resultPromises = files
            .filter(function (filePath) {
            var shouldExecute = _this._backers.every(function (backer) {
                return backer.shouldExecute({ filePath: filePath });
            });
            // add fake unExecutedResults for un-executed file.
            if (!shouldExecute) {
                unExecutedResults.push(_this._createFakeResult(filePath));
            }
            return shouldExecute;
        })
            .map(function (filePath) {
            return executeFile(filePath).then(function (result) {
                _this._backers.forEach(function (backer) {
                    backer.didExecute({ result: result });
                });
                return result;
            });
        })
            .concat(unExecutedResults);
        // wait all resolved, and call afterAll
        return Promise.all(resultPromises).then(function (results) {
            _this._backers.forEach(function (backer) {
                backer.afterAll();
            });
            return results;
        });
    };
    /**
     * create fake result object
     * @param {string} filePath
     * @returns {TextlintResult}
     * @private
     */
    ExecuteFileBackerManager.prototype._createFakeResult = function (filePath) {
        return Promise.resolve({
            filePath: filePath,
            messages: []
        });
    };
    return ExecuteFileBackerManager;
}());
exports.ExecuteFileBackerManager = ExecuteFileBackerManager;