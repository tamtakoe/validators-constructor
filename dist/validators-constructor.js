(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Validators = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var FORMAT_REGEXP = /(%?)%\{([^\}]+)\}/g; // Finds %{key} style patterns in the given string
var MESSAGE_REGEXP = /message/i;
var hiddenPropertySettings = {
    enumerable: false,
    configurable: false,
    writable: true
};
var RESULT_HANDLER = 'resultHandler';
var EXCEPTION_HANDLER = 'exceptionHandler';
var ERROR_FORMAT = 'errorFormat';
var MESSAGE = 'message';
var SIMPLE_ARGS_FORMAT = 'simpleArgsFormat';
var ARG = 'arg';

/**
 * Add extra advantages to validator
 *
 * @param {Object}   validators - validators library
 * @param {String}   name - validator's name
 * @param {Function} validator - user validator
 *
 * @returns {Function} extended validator
 */
function validatorWrapper(validators, name, validator) {
    return function (value, options) {
        var error = void 0,
            args = arguments;
        var alias = this && this.alias;
        var validatorObj = validators[name];
        var validatorAliasObj = alias ? validators[alias] : {};
        var arg = validatorObj[ARG] || validatorAliasObj[ARG] || validators[ARG];
        var isSimpleArgsFormat = validatorObj[SIMPLE_ARGS_FORMAT] || validatorAliasObj[SIMPLE_ARGS_FORMAT] || validators[SIMPLE_ARGS_FORMAT];

        options = Object.assign({}, validatorObj.defaultOptions, validatorAliasObj.defaultOptions, options);

        if (typeof options.parse === 'function') {
            value = options.parse(value);
        }

        if (options.hasOwnProperty(arg) && !isSimpleArgsFormat) {
            args = [value, options[arg]].concat(Array.prototype.slice.call(arguments, 1));
        }

        try {
            var resultHandler = validatorObj[RESULT_HANDLER] || validatorAliasObj[RESULT_HANDLER] || validators[RESULT_HANDLER];

            error = resultHandler(validator.apply(validators, args));
        } catch (err) {
            var exceptionHandler = validatorObj[EXCEPTION_HANDLER] || validatorAliasObj[EXCEPTION_HANDLER] || validators[EXCEPTION_HANDLER];

            if (typeof exceptionHandler === 'function') {
                error = exceptionHandler(err);
            } else {
                throw err;
            }
        }

        function handleError(error) {
            if (error) {
                var _ret = function () {
                    var errorObj = (typeof error === 'undefined' ? 'undefined' : _typeof(error)) === 'object' ? error : null; //in case if we rewrite message in options and want to use fields from error object in the placeholders
                    var message = options[MESSAGE] || validatorObj[MESSAGE] || validatorAliasObj[MESSAGE];

                    if (message) {
                        error = message;
                    }

                    var formattedErrorMessage = validators.formatMessage(error, Object.assign({ validator: alias || name, value: value }, errorObj, options));
                    var format = validatorObj[ERROR_FORMAT] || validatorAliasObj[ERROR_FORMAT] || validators[ERROR_FORMAT];

                    if (format) {
                        if (typeof formattedErrorMessage === 'string') {
                            formattedErrorMessage = { message: formattedErrorMessage };
                        }

                        if (format.$options) {
                            format = Object.assign({}, format);

                            Object.keys(options).forEach(function (key) {
                                if (!MESSAGE_REGEXP.test(key) && typeof options[key] !== 'function') {
                                    format[key] = options[key];
                                }
                            });
                        }
                        delete format.$options;

                        if (format.$origin) {
                            format = Object.assign({}, format, formattedErrorMessage);
                        }
                        delete format.$origin;

                        return {
                            v: validators.formatMessage(format, Object.assign({ validator: alias || name, value: value }, options, formattedErrorMessage))
                        };
                    }

                    return {
                        v: formattedErrorMessage
                    };
                }();

                if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
            }
        }

        return (typeof error === 'undefined' ? 'undefined' : _typeof(error)) === 'object' && typeof error.then === 'function' ? error.then(handleError) : handleError(error);
    };
}

/**
 * Format string with patterns
 *
 * @param {String} str ("I'm %{age} years old")
 * @param {Object} [values] ({age: 21})
 *
 * @returns {String} formatted string ("I'm 21 years old")
 */
function formatStr(str, values) {
    values = values || {};

    if (typeof str !== 'string') {
        return str;
    }

    return str.replace(FORMAT_REGEXP, function (m0, m1, m2) {
        return m1 === '%' ? "%{" + m2 + "}" : values[m2];
    });
}

/**
 * Check that value is plain object
 *
 * @param {Any} value
 *
 * @returns {Boolean}
 */
function isPlainObject(value) {
    return {}.toString.call(value) === '[object Object]' && (typeof value.toDate !== 'function' || value.propertyIsEnumerable('toDate')); //For moment.js dates
}

/**
 * Validators constructor
 *
 * @param {Object}          [params]
 * @param {Object}            [errorFormat] - format of validators result
 * @param {Function}          [formatStr] - for format message strings with patterns
 * @param {Function}          [resultHandler] - handle result of validation
 * @param {Function|String}   [exceptionHandler] - handle JS exceptions
 * @param {String}            [simpleArgsFormat] - don't map arg to options.arg or vice versa
 * @param {String}            [arg] - name of compared value
 * @param {Object}            [util] - reserved for validator's libraries helpers
 *
 * @constructor
 */
function Validators(params) {
    Object.defineProperties(this, {
        errorFormat: hiddenPropertySettings,
        formatStr: hiddenPropertySettings,
        resultHandler: hiddenPropertySettings,
        exceptionHandler: hiddenPropertySettings,
        arg: hiddenPropertySettings,
        ignoreOptionsAfterArg: hiddenPropertySettings,
        util: hiddenPropertySettings
    });

    this.errorFormat = {
        error: '%{validator}',
        message: '%{message}',
        $options: true,
        $origin: true
    };
    this.formatStr = formatStr;
    this.resultHandler = function (result) {
        return result;
    };
    this.arg = 'arg';
    this.util = {};

    Object.assign(this, params);
}

/**
 * @param {String} name of validator
 * @param {Function|String|Array} validator, alias or validators array
 * @param {Object} params
 *
 * @returns {Validators} Validators instance
 */
function addValidator(name, validator, params) {
    var _this = this;
    var validators = validator instanceof Array ? validator : [validator];
    var validate = void 0;

    if (typeof validator === 'string') {
        validate = function validate() /*value, arg, options*/{
            return _this[validator].apply({ alias: name, _this: _this }, arguments);
        };
    } else {
        validate = function validate(value /*arg, options*/) {
            var args = Array.prototype.slice.call(arguments, 2);
            var arg1 = arguments[1];
            var arg2 = arguments[2];
            var _this2 = this && this._this || _this;
            var isSimpleArgsFormat = _this2[name][SIMPLE_ARGS_FORMAT] || _this2[SIMPLE_ARGS_FORMAT];
            var options = !isSimpleArgsFormat && isPlainObject(arg2) ? arg2 : {};

            if (arg1 != null && typeof arg1 !== 'boolean') {
                if (isPlainObject(arg1) || isSimpleArgsFormat) {
                    options = arg1;
                } else {
                    options[_this2[name][ARG] || _this2[ARG]] = arg1;
                    args.shift();
                }
            }

            for (var i = 0; i < validators.length; i++) {
                var base = validators[i];

                switch (typeof base === 'undefined' ? 'undefined' : _typeof(base)) {
                    case 'function':
                        validator = validatorWrapper(_this2, name, base);break;

                    case 'string':
                        validator = _this2[base];break;

                    case 'object':
                        validator = _this2[base[0]];
                        options = Object.assign({}, options, base[1]);
                }

                var error = validator.apply(this, [value, options].concat(args));

                if (error) {
                    return error;
                }
            }
        };
    }

    Object.assign(validate, params);

    validate.curry = function () /*arg, options*/{
        var _arguments = arguments;
        //Partial application
        return function (value) {
            return validate.apply(_this, [value].concat(Array.prototype.slice.call(_arguments)));
        };
    };

    _this[name] = validate;
}

/**
 * @param {String|Object} validatorName or validators map like {validator1: validator1Fn, validator2: validator2Fn, ...}
 * @param {Object} params for every validator
 *
 * @returns {Validators} Validators instance
 */
Validators.prototype.add = function (validatorName, validators, params) {
    var _this3 = this;

    if (typeof validatorName === 'string') {
        addValidator.call(this, validatorName, validators, params);
    } else {
        Object.keys(validatorName).forEach(function (key) {
            return addValidator.call(_this3, key, validatorName[key], validators);
        });
    }

    return this;
};

/**
 * Format any structure which contains pattern strings
 *
 * @param {String|Object|Function} message. Object will be processed recursively. Function will be executed
 * @param {Object} [values]
 *
 * @returns {String|Object} formatted string or object
 */
Validators.prototype.formatMessage = function (message, values) {
    var _this4 = this;

    if (typeof message === 'function') {
        message = message(values.value, values);
    }

    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) === 'object') {
        var formattedMessage = {};

        Object.keys(message).forEach(function (key) {
            return formattedMessage[_this4.formatStr(key, values)] = _this4.formatStr(message[key], values);
        });

        if (message[MESSAGE]) {
            //Show not enumerable message of JS exception
            formattedMessage[MESSAGE] = this.formatStr(message[MESSAGE], values);
        }

        return formattedMessage;
    }

    return this.formatStr(message, values);
};

module.exports = function (options) {
    return new Validators(options);
};
},{}]},{},[1])(1)
});