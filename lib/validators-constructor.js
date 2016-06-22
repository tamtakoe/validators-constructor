'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var FORMAT_REGEXP = /(%?)%\{([^\}]+)\}/g; // Finds %{key} style patterns in the given string
var MESSAGE_REGEXP = /message/i;
var COMPARED_VALUE = 'comparedValue';
var hiddenPropertySettings = {
    enumerable: false,
    configurable: false,
    writable: true
};

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
    return function (value, comparedValue, options, alias) {
        var noComparedValue;

        if (validator.length < 3) {
            noComparedValue = true;
            options = comparedValue;
        }

        options = options || {};

        if (options.hasOwnProperty(COMPARED_VALUE)) {
            noComparedValue = false;
            comparedValue = options[COMPARED_VALUE];
        }

        if (!noComparedValue) {
            options[COMPARED_VALUE] = comparedValue;
        }

        options = Object.assign({}, validators[name].defaultOptions, options);

        if (typeof options.parse === 'function') {
            value = options.parse(value);
        }

        var error = noComparedValue ? validator.call(validators, value, options) : validator.call(validators, value, comparedValue, options);

        if (error) {
            var _ret = function () {
                if (options.message) {
                    error = options.message;
                }

                var formattedErrorMessage = validators.formatMessage(error, Object.assign({ value: value }, options));
                var format = validators[name].errorFormat || validators.errorFormat;

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
 * @param {String} name of validator
 * @param {Function|String|Array} validator, alias or validators array
 */
Validators.prototype.add = function (name, validator) {
    var _this = this;

    if (typeof validator === 'string') {
        //alias
        this[name] = function (value, comparedValue, options) {
            return _this[validator](value, comparedValue, options, name);
        };
    } else {
        var validators = validator instanceof Array ? validator : [validator];

        this[name] = function (value, comparedValue, options, alias) {
            for (var i = 0; i < validators.length; i++) {
                var base = validators[i];
                var options = options instanceof Array ? options[i] : options;

                switch (typeof base === 'undefined' ? 'undefined' : _typeof(base)) {
                    case 'function':
                        validator = validatorWrapper(_this, name, base);break;

                    case 'string':
                        validator = _this[base];break;

                    case 'object':
                        validator = _this[base.validator];
                        options = Object.assign({}, base.options, options);
                }

                var error = validator(value, comparedValue, options, alias);

                if (error) {
                    return error;
                }
            }
        };
    }

    return this;
};

/**
 * @param {Object} validatorsObj. F.e. {validator1: validator1Fn, validator2: validator2Fn, ...}
 */
Validators.prototype.load = function (validatorsObj) {
    var _this2 = this;

    Object.keys(validatorsObj).forEach(function (key) {
        return _this2.add(key, validatorsObj[key]);
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
        var _ret2 = function () {
            var formattedMessage = {};

            Object.keys(message).forEach(function (key) {
                return formattedMessage[_this3.formatStr(key, values)] = _this3.formatStr(message[key], values);
            });

            return {
                v: formattedMessage
            };
        }();

        if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
    }

    return this.formatStr(message, values);
};

module.exports = function (options) {
    return new Validators(options);
};