'use strict';

const FORMAT_REGEXP = /(%?)%\{([^\}]+)\}/g; // Finds %{key} style patterns in the given string
const MESSAGE_REGEXP = /message/i;
const hiddenPropertySettings = {
    enumerable: false,
    configurable: false,
    writable: true
};
const RESULT_HANDLER = 'resultHandler';
const EXCEPTION_HANDLER = 'exceptionHandler';
const ERROR_FORMAT = 'errorFormat';
const MESSAGE = 'message';

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
    return function(value, options) {
        let error, args = arguments;
        const alias = this && this.alias;
        const validatorObj = validators[name];
        const validatorAliasObj = alias ? validators[alias] : {};

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

        } catch(err) {
            var exceptionHandler = validatorObj[EXCEPTION_HANDLER] || validatorAliasObj[EXCEPTION_HANDLER] || validators[EXCEPTION_HANDLER];

            if (typeof exceptionHandler === 'function') {
                error = exceptionHandler(err);
            } else {
                throw err;
            }
        }

        if (error) {
            let message = options[MESSAGE] || validatorObj[MESSAGE] || validatorAliasObj[MESSAGE];

            if (message) {
                error = message;
            }

            let formattedErrorMessage = validators.formatMessage(error, Object.assign({validator: alias || name, value: value}, options));
            let format = validatorObj[ERROR_FORMAT] || validatorAliasObj[ERROR_FORMAT] || validators[ERROR_FORMAT];

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
    this.resultHandler = function(result) {
        return result;
    };
    this.exceptionHandler = function(err) {
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
        _this[name] = function(/*value, arg, options*/) {
            return _this[validator].apply({alias: name, _this: _this}, arguments);
        };

    } else {
        var validators = validator instanceof Array ? validator : [validator];

        _this[name] = function(value /*arg, options*/) {
            let options;
            let args = Array.prototype.slice.call(arguments, 2);
            
            _this = this && this._this || _this;

            if (arguments[1] === undefined || ({}).toString.call(arguments[1]) === '[object Object]') {
                options = arguments[1] || {};
            } else {
                options = arguments[2] || {};
                options[_this.arg] = arguments[1];
                args.shift();
            }

            for (var i = 0; i < validators.length; i++) {
                var base = validators[i];

                switch (typeof base) {
                    case 'function':
                        validator = validatorWrapper(_this, name, base); break;

                    case 'string':
                        validator = _this[base]; break;

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
Validators.prototype.load = function(validatorsObj, params) {
    Object.keys(validatorsObj).forEach(key => this.add(key, validatorsObj[key], params));

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
Validators.prototype.formatMessage = function(message, values) {
    if (typeof message === 'function') {
        message = message(values.value, values);
    }

    if (typeof message === 'object') {
        var formattedMessage = {};

        Object.keys(message).forEach(key => formattedMessage[this.formatStr(key, values)] = this.formatStr(message[key], values));

        if (message[MESSAGE]) { //Show not enumerable message of JS exception
            formattedMessage[MESSAGE] = this.formatStr(message[MESSAGE], values);
        }

        return formattedMessage;
    }

    return this.formatStr(message, values);
};

module.exports = function(options) {
    return new Validators(options);
};