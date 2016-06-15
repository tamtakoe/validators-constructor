'use strict';

const FORMAT_REGEXP = /(%?)%\{([^\}]+)\}/g; // Finds %{key} style patterns in the given string
const MESSAGE_REGEXP = /message/i;
const hiddenPropertySettings = {
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

    return str.replace(FORMAT_REGEXP, (m0, m1, m2) => (m1 === '%' ? "%{" + m2 + "}" : values[m2]));
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
Validators.prototype.formatMessage = function(message, values) {
    if (typeof message === 'function') {
        message = message(values.value, values);
    }

    if (typeof message === 'object') {
        let formattedMessage = {};

        Object.keys(message).forEach(key => formattedMessage[this.formatStr(key, values)] = this.formatStr(message[key], values));

        return formattedMessage;
    }

    return this.formatStr(message, values);
};

/**
 * @param {String} name of validator
 * @param {Function|String} validator or alias
 */
Validators.prototype.add = function(name, validator) {
    if (typeof validator === 'string') {
        this[name] = (value, options) => this[validator](value, options, name);

    } else if (typeof validator === 'function') {
        this[name] = (value, options, validatorName) => {
            if (({}).toString.call(options) !== '[object Object]') { //options can be regExp or array
                options = {comparedValue: options};
            }

            options = Object.assign({}, this[name].defaultOptions, options);

            if (typeof options.parse === 'function') {
                value = options.parse(value);
            }

            let error = validator(value, options);

            if (error) {
                if (options.message) {
                    error = options.message;
                }

                let formattedErrorMessage = this.formatMessage(error, Object.assign({value: value}, options));
                let format = this[name].errorFormat || this.errorFormat;

                if (format) {
                    if (typeof formattedErrorMessage === 'string') {
                        formattedErrorMessage = {message: formattedErrorMessage};
                    }

                    if (format.$options) {
                        format = Object.assign({}, format);

                        Object.keys(options).forEach(key => {
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

                    return this.formatMessage(format, Object.assign(
                        {validator: validatorName || name, value: value}, options, formattedErrorMessage
                    ));
                }

                return formattedErrorMessage;
            }
        }
    }
};

/**
 * @param {Object} validatorsObj. F.e. {validator1: validator1Fn, validator2: validator2Fn, ...}
 */
Validators.prototype.load = function(validatorsObj) {
    Object.keys(validatorsObj).forEach(key => this.add(key, validatorsObj[key]));
};

module.exports = function(options) {
    return new Validators(options);
};
