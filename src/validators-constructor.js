'use strict';

const FORMAT_REGEXP = /(%?)%\{([^\}]+)\}/g; // Finds %{key} style patterns in the given string
const MESSAGE_REGEXP = /message/i;
const COMPARED_VALUE = 'comparedValue';
const hiddenPropertySettings = {
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
    return function(value, comparedValue, options, alias) {
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

        let error = noComparedValue ? validator.call(validators, value, options) : validator.call(validators, value, comparedValue, options);

        if (error) {
            if (options.message) {
                error = options.message;
            }

            let formattedErrorMessage = validators.formatMessage(error, Object.assign({value: value}, options));
            let format = validators[name].errorFormat || validators.errorFormat;

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
                    format = Object.assign({}, format, formattedErrorMessage);
                    delete format.$origin;
                }

                return validators.formatMessage(format, Object.assign(
                    {validator: alias || name, value: value}, options, formattedErrorMessage
                ));
            }

            return formattedErrorMessage;
        }
    }
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
 * @param {String} name of validator
 * @param {Function|String|Array} validator, alias or validators array
 */
Validators.prototype.add = function (name, validator) {
    if (typeof validator === 'string') { //alias
        this[name] = (value, comparedValue, options) => this[validator](value, comparedValue, options, name);

    } else {
        var validators = validator instanceof Array ? validator : [validator];

        this[name] = (value, comparedValue, options, alias) => {
            for (var i = 0; i < validators.length; i++) {
                var base = validators[i];
                var options = options instanceof Array ? options[i] : options;

                switch (typeof base) {
                    case 'function':
                        validator = validatorWrapper(this, name, base); break;

                    case 'string':
                        validator = this[base]; break;

                    case 'object':
                        validator = this[base.validator];
                        options = Object.assign({}, base.options, options);
                }

                var error = validator(value, comparedValue, options, alias);

                if (error) {
                    return error;
                }
            }
        };
    }
};

/**
 * @param {Object} validatorsObj. F.e. {validator1: validator1Fn, validator2: validator2Fn, ...}
 */
Validators.prototype.load = function(validatorsObj) {
    Object.keys(validatorsObj).forEach(key => this.add(key, validatorsObj[key]));
};

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

module.exports = function(options) {
    return new Validators(options);
};