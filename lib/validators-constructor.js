'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var FORMAT_REGEXP = /(%?)%\{([^\}]+)\}/g; // Finds %{key} style patterns in the given string
var MESSAGE_REGEXP = /message/i;
var hiddenPropertySettings = {
    enumerable: false,
    configurable: false,
    writable: true
};

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
 * @param {Object}   [options]
 * @param {Object}     [errorFormat] - format of validators result
 * @param {Function}   [formatStr] - for format message strings with patterns
 *
 * @constructor
 */
function Validators(options) {
    Object.defineProperties(this, {
        errorFormat: hiddenPropertySettings,
        formatStr: hiddenPropertySettings
    });

    this.errorFormat = {
        error: '%{validator}',
        message: '%{message}',
        $options: true,
        $origin: true
    };

    this.formatStr = formatStr;

    Object.assign(this, options);
}

/**
 * Format any structure which contains pattern strings
 *
 * @param {String|Object|Function} message. Object will be processed recursively. Function will be executed
 * @param {Object} [values]
 *
 * @returns {String|Object} formatted string or object
 */
Validators.prototype.formatMessage = function (message, values) {
    var _this = this;

    if (typeof message === 'function') {
        message = message(values.value, values);
    }

    if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) === 'object') {
        var _ret = function () {
            var formattedMessage = {};

            Object.keys(message).forEach(function (key) {
                return formattedMessage[_this.formatStr(key, values)] = _this.formatStr(message[key], values);
            });

            return {
                v: formattedMessage
            };
        }();

        if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
    }

    return this.formatStr(message, values);
};

/**
 * @param {String} name of validator
 * @param {Function|String} validator or alias
 */
Validators.prototype.add = function (name, validator) {
    var _this2 = this;

    if (typeof validator === 'string') {
        this[name] = function (value, comparedValue, options) {
            return _this2[validator](value, comparedValue, options, name);
        };
    } else if (typeof validator === 'function') {
        this[name] = function (value, comparedValue, options, validatorName) {
            var noComparedValue;

            if (validator.length < 3) {
                noComparedValue = true;
                options = comparedValue;
            }

            options = options || {};

            if (options.hasOwnProperty('comparedValue')) {
                noComparedValue = false;
                comparedValue = options.comparedValue;
            }

            if (!noComparedValue) {
                options.comparedValue = comparedValue;
            }

            options = Object.assign({}, _this2[name].defaultOptions, options);

            if (typeof options.parse === 'function') {
                value = options.parse(value);
            }

            var error = noComparedValue ? validator(value, options) : validator(value, comparedValue, options);

            if (error) {
                var _ret2 = function () {
                    if (options.message) {
                        error = options.message;
                    }

                    var formattedErrorMessage = _this2.formatMessage(error, Object.assign({ value: value }, options));
                    var format = _this2[name].errorFormat || _this2.errorFormat;

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
                            format = Object.assign({}, formattedErrorMessage, format);
                            delete format.$origin;
                        }

                        return {
                            v: _this2.formatMessage(format, Object.assign({ validator: validatorName || name, value: value }, options, formattedErrorMessage))
                        };
                    }

                    return {
                        v: formattedErrorMessage
                    };
                }();

                if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
            }
        };
    }
};

/**
 * @param {Object} validatorsObj. F.e. {validator1: validator1Fn, validator2: validator2Fn, ...}
 */
Validators.prototype.load = function (validatorsObj) {
    var _this3 = this;

    Object.keys(validatorsObj).forEach(function (key) {
        return _this3.add(key, validatorsObj[key]);
    });
};

module.exports = function (options) {
    return new Validators(options);
};