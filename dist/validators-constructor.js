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

        options = Object.assign({}, validatorObj.defaultOptions, validatorAliasObj.defaultOptions, options);

        if (typeof options.parse === 'function') {
            value = options.parse(value);
        }

        if (options.hasOwnProperty(validators.arg)) {
            args = [value, options[validators.arg]].concat(Array.prototype.slice.call(arguments, 1));
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

        if (error) {
            var _ret = function () {
                var message = options[MESSAGE] || validatorObj[MESSAGE] || validatorAliasObj[MESSAGE];

                if (message) {
                    error = message;
                }

                var formattedErrorMessage = validators.formatMessage(error, Object.assign({ validator: alias || name, value: value }, options));
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
                        delete format.$options;
                    }

                    if (format.$origin) {
                        format = Object.assign({}, format, formattedErrorMessage);
                        delete format.$origin;
                    }

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
 * Validators constructor
 *
 * @param {Object}          [params]
 * @param {Object}            [errorFormat] - format of validators result
 * @param {Function}          [formatStr] - for format message strings with patterns
 * @param {Function}          [resultHandler] - handle result of validation
 * @param {Function|String}   [exceptionHandler] - handle JS exceptions
 * @param {String}            [arg] - name of compared value
 *
 * @constructor
 */
function Validators(params) {
    Object.defineProperties(this, {
        errorFormat: hiddenPropertySettings,
        formatStr: hiddenPropertySettings,
        resultHandler: hiddenPropertySettings,
        exceptionHandler: hiddenPropertySettings,
        arg: hiddenPropertySettings
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
    this.exceptionHandler = function (err) {
        return err;
    };
    this.arg = 'arg';

    Object.assign(this, params);
}

/**
 * @param {String} name of validator
 * @param {Function|String|Array} validator, alias or validators array
 * @param {Object} params
 *
 * @returns {Validators} Validators instance
 */
Validators.prototype.add = function (name, validator, params) {
    var _this = this;

    if (typeof validator === 'string') {
        _this[name] = function () /*value, arg, options*/{
            return _this[validator].apply({ alias: name, _this: _this }, arguments);
        };
    } else {
        var validators = validator instanceof Array ? validator : [validator];

        _this[name] = function (value /*arg, options*/) {
            var options = void 0;
            var args = Array.prototype.slice.call(arguments, 2);

            _this = this && this._this || _this;

            if (arguments[1] === undefined || {}.toString.call(arguments[1]) === '[object Object]') {
                options = arguments[1] || {};
            } else {
                options = arguments[2] || {};
                options[_this.arg] = arguments[1];
                args.shift();
            }

            for (var i = 0; i < validators.length; i++) {
                var base = validators[i];

                switch (typeof base === 'undefined' ? 'undefined' : _typeof(base)) {
                    case 'function':
                        validator = validatorWrapper(_this, name, base);break;

                    case 'string':
                        validator = _this[base];break;

                    case 'object':
                        validator = _this[base[0]];
                        options = Object.assign({}, options, base[1]);
                }

                var error = validator.apply(this, [value, options].concat(args));

                if (error) {
                    return error;
                }
            }
        };
    }

    Object.assign(_this[name], params);

    return _this;
};

/**
 * @param {Object} validatorsObj. F.e. {validator1: validator1Fn, validator2: validator2Fn, ...}
 * @param {Object} params for every validator
 *
 * @returns {Validators} Validators instance
 */
Validators.prototype.load = function (validatorsObj, params) {
    var _this2 = this;

    Object.keys(validatorsObj).forEach(function (key) {
        return _this2.add(key, validatorsObj[key], params);
    });

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
    var _this3 = this;

    if (typeof message === 'function') {
        message = message(values.value, values);
    }

    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) === 'object') {
        var formattedMessage = {};

        Object.keys(message).forEach(function (key) {
            return formattedMessage[_this3.formatStr(key, values)] = _this3.formatStr(message[key], values);
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