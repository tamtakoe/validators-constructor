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
const SIMPLE_ARGS_FORMAT = 'simpleArgsFormat';
const ONE_OPTIONS_ARG = 'oneOptionsArg';
const ARG = 'arg';

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
        const arg = validatorObj[ARG] || validatorAliasObj[ARG] || validators[ARG];
        const isSimpleArgsFormat = validatorObj[SIMPLE_ARGS_FORMAT] || validatorAliasObj[SIMPLE_ARGS_FORMAT] || validators[SIMPLE_ARGS_FORMAT];

        options = assign({}, validatorObj.defaultOptions, validatorAliasObj.defaultOptions, options);

        if (typeof options.parse === 'function') {
            value = options.parse(value);
        }

        if (options.hasOwnProperty(arg) && !isSimpleArgsFormat) {
            args = [value, options[arg]].concat(Array.prototype.slice.call(arguments, 1));
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
        
        function handleError(error) {
            if (error) {
                const errorObj = typeof error === 'object' ? error : null; //in case if we rewrite message in options and want to use fields from error object in the placeholders
                let message = options[MESSAGE] || validatorObj[MESSAGE] || validatorAliasObj[MESSAGE];

                if (message) {
                    error = message;
                }

                let formattedErrorMessage = validators.formatMessage(error, assign(
                    {validator: alias || name, value: value}, errorObj, options
                ));
                let format = validatorObj[ERROR_FORMAT] || validatorAliasObj[ERROR_FORMAT] || validators[ERROR_FORMAT];

                if (format) {
                    if (typeof formattedErrorMessage === 'string') {
                        formattedErrorMessage = {message: formattedErrorMessage};
                    }

                    if (format.$options) {
                        format = assign({}, format);

                        Object.keys(options).forEach(key => {
                            if (!MESSAGE_REGEXP.test(key) && typeof options[key] !== 'function') {
                                format[key] = options[key];
                            }
                        });
                    }
                    delete format.$options;

                    if (format.$origin) {
                        format = assign({}, format, formattedErrorMessage);
                    }
                    delete format.$origin;

                    return validators.formatMessage(format, assign(
                        {validator: alias || name, value: value}, options, formattedErrorMessage
                    ));
                }

                return formattedErrorMessage;
            }
        }

        return typeof error === 'object' && typeof error.then === 'function' ? error.then(handleError) : handleError(error);
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
 * Check that value is plain object
 *
 * @param {Any} value
 *
 * @returns {Boolean}
 */
function isPlainObject(value) {
    return {}.toString.call(value) === '[object Object]'
        && (typeof value.toDate !== 'function' || value.propertyIsEnumerable('toDate')); //For moment.js dates
}

/**
 * Extend objects
 *
 * @param {Object} first argument
 * @param {Any} other arguments
 *
 * @returns {Object}
 */
function assign(){
    for(let i = 1; i < arguments.length; i++)
        for(const k in arguments[i])
            if(arguments[i].hasOwnProperty(k))
                arguments[0][k] = arguments[i][k];
    return arguments[0];
}

/**
 * Validators constructor
 *
 * @param {Object}          [params]
 * @param {Object}            [errorFormat] - format of validators result
 * @param {Function}          [formatStr] - for format message strings with patterns
 * @param {Function}          [resultHandler] - handle result of validation
 * @param {Function|String}   [exceptionHandler] - handle JS exceptions
 * @param {String}            [simpleArgsFormat] - any non object argument will be transformed to the `{arg: <argument>}`
 * @param {String}            [oneOptionsArg] - ignore second options argument
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
        simpleArgsFormat: hiddenPropertySettings,
        oneOptionsArg: hiddenPropertySettings,
        util: hiddenPropertySettings
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
    this.arg = 'arg';
    this.util = {};

    assign(this, params);
}

/**
 * @param {String} name of validator
 * @param {Function|String|Array} validator, alias or validators array
 * @param {Object} params
 *
 * @returns {Validators} Validators instance
 */
function addValidator(name, validator, params) {
    const _this = this;
    const validators = validator instanceof Array ? validator : [validator];
    let validate;

    if (typeof validator === 'string') {
        validate = function(/*value, arg, options*/) {
            return _this[validator].apply({alias: name, _this: _this}, arguments);
        };

    } else {
        validate = function(value /*arg, options*/) {
            const args = Array.prototype.slice.call(arguments, 2);
            const arg1 = arguments[1];
            const arg2 = arguments[2];
            const _this2 = this && this._this || _this;
            const isSimpleArgsFormat = _this2[name][SIMPLE_ARGS_FORMAT] || _this2[SIMPLE_ARGS_FORMAT];
            const isOneOptionsArg = _this2[name][ONE_OPTIONS_ARG] || _this2[ONE_OPTIONS_ARG];
            let options = !isOneOptionsArg && isPlainObject(arg2) ? arg2 : {};
            
            if (arg1 != null && typeof arg1 !== 'boolean') {
                if (isPlainObject(arg1)) {
                    options = arg1;
                } else {
                    options[_this2[name][ARG] || _this2[ARG]] = arg1;

                    if (!isSimpleArgsFormat) {
                        args.shift();
                    }
                }
            }
            
            for (var i = 0; i < validators.length; i++) {
                var base = validators[i];

                switch (typeof base) {
                    case 'function':
                        validator = validatorWrapper(_this2, name, base); break;

                    case 'string':
                        validator = _this2[base]; break;

                    case 'object':
                        validator = _this2[base[0]];
                        options = assign({}, options, base[1]);
                }

                var error = validator.apply(this, [value, options].concat(args));

                if (error) {
                    return error;
                }
            }
        };
    }

    assign(validate, params);

    validate.curry = function(/*arg, options*/) { //Partial application
        return value => validate.apply(_this, [value].concat(Array.prototype.slice.call(arguments)));
    };

    _this[name] = validate;
}

/**
 * @param {String|Object} validatorName or validators map like {validator1: validator1Fn, validator2: validator2Fn, ...}
 * @param {Object} params for every validator
 *
 * @returns {Validators} Validators instance
 */
Validators.prototype.add = function(validatorName, validators, params) {
    if (typeof validatorName === 'string') {
        addValidator.call(this, validatorName, validators, params);
        
    } else {
        Object.keys(validatorName).forEach(key => addValidator.call(this, key, validatorName[key], validators));
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