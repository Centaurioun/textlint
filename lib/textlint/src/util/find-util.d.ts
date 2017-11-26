/**
 * filter files by config
 * @param {string[]} patterns glob patterns
 * @param {{extensions?: string[], cwd?: string }} options
 */
export declare function pathsToGlobPatterns(patterns: string[], options?: {
    extensions?: string[];
    cwd?: string;
}): string[];
/**
 * found files by glob pattern
 * @param {string[]} patterns
 * @param {{cwd?: string }} options
 * @returns {string[]} file path list
 */
export declare function findFiles(patterns: string[], options?: {
    cwd?: string;
}): string[];
/**
 * @param {string[]} files
 * @param {{extensions?: string[]}} [options]
 * @returns {{availableFiles: string[], unAvailableFiles: string[]}}
 */
export declare function separateByAvailability(files: string[], options?: {
    extensions?: string[];
}): {
    availableFiles: string[];
    unAvailableFiles: string[];
};