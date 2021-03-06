/* jshint node:true, undef:true, unused:true */

var ModuleContainer = require('es6-module-transpiler').Container;
var FileResolver = require('es6-module-transpiler').FileResolver;
var formatters = require('es6-module-transpiler').formatters;

var path = require('path');
var mergeTrees = require('broccoli-merge-trees');
var helpers = require('broccoli-kitchen-sink-helpers');
var Writer = require('broccoli-writer');

/**
 * Returns a broccoli tree generator based on the given input tree and options.
 *
 * @param inputTree
 * @param options
 * @returns {CompileModules}
 */
function compileModules(inputTree, options) {
  return new CompileModules(inputTree, options);
}

CompileModules.prototype = Object.create(Writer.prototype);
CompileModules.prototype.constructor = CompileModules;

/**
 * Creates a new compiled modules writer.
 *
 * @param inputTree
 * @param options
 * @extends {Writer}
 * @constructor
 */
function CompileModules(inputTree, options) {
  this.setInputTree(inputTree);
  this.setInputFiles(options.inputFiles);
  this.setOutput(options.output);
  this.setFormatter(options.formatter);
}

/**
 * Sets the input tree to read files from.
 *
 * @param inputTree
 */
CompileModules.prototype.setInputTree = function(inputTree) {
  if (inputTree === undefined || inputTree === null) {
    throw new Error('Expected input tree object, got: ' + inputTree);
  }

  this.inputTree = inputTree;
};

/**
 * Sets the input files list of globs.
 *
 * @param {[string]} inputFiles
 */
CompileModules.prototype.setInputFiles = function(inputFiles) {
  if (!Array.isArray(inputFiles)) {
    throw new Error('Expected an array of input file globs, got: ' + inputFiles);
  }
  this.inputFiles = inputFiles;
};

/**
 * Sets the output directory or file.
 *
 * @param {string} output
 */
CompileModules.prototype.setOutput = function(output) {
  helpers.assertAbsolutePaths([output]);
  this.output = output;
};

/**
 * Sets the current formatter.
 *
 * @param formatter
 */
CompileModules.prototype.setFormatter = function(formatter) {
  if (!formatter) {
    formatter = formatters.DEFAULT;
  }

  if (typeof formatter === 'string') {
    var formatterName = formatter;
    formatter = formatters[formatter];
    if (typeof formatter !== 'function') {
      throw new Error(
        'No built-in module output formatter named `' +
        formatterName + '`, choose one of ' +
        Object.keys(formatters).filter(function(key) {
          return key !== 'DEFAULT';
        }).join(', ')
      );
    }
    formatter = new formatter();
  }

  if (typeof formatter !== 'object') {
    throw new Error(
      'Expected module output formatter object, got: ' + formatter
    );
  }

  this.formatter = formatter;
};

/**
 * Writes modules to the given destination directory.
 *
 * @param readTree
 * @param {string} destDir
 * @returns {Promise}
 */
CompileModules.prototype.write = function(readTree, destDir) {
  return readTree(this.inputTree).then(function(srcDir) {
    var container = new ModuleContainer({
      formatter: this.formatter,
      resolvers: [new FileResolver([srcDir])]
    });

    var inputFiles = helpers.multiGlob(this.inputFiles, {cwd: srcDir});
    for (var i = 0; i < inputFiles.length; i++) {
      container.getModule(inputFiles[i]);
    }

    container.write(path.join(destDir, this.output));
  }.bind(this));
};

module.exports = compileModules;
