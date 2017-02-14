'use strict';

const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
const Validators = require('../src/validators-constructor');
let validators;

chai.use(chaiAsPromised);

describe('validators', function() {

    beforeEach(function() {
        validators = Validators();
    });

    it('should add validator', function() {
        validators.add('myValidator', function(value) {
            if (!value) {
                return 'must to be';
            }
        });

        expect(validators.myValidator).to.be.function;
    });

    it('should add validators', function() {
        validators.add({
            validator1: function(value) {
                if (!value) {
                    return 'must to be';
                }
            },
            validator2: function(value) {
                if (value) {
                    return 'must not to be';
                }
            }
        });

        expect(validators.validator1).to.be.function;
        expect(validators.validator2).to.be.function;
    });

    it('should set options if errorFormat.$options is true and options is plain object', function() {
        validators.add('isEqual', function(value, arg, options) {
            if (value !== options.arg) {
                return 'not equal';
            }
        }, {
            errorFormat: {
                $options: true
            }
        });

        const error1 = validators.isEqual(1, 2, {'strict': true});
        const error2 = validators.isEqual(1, 2, ['a', 'b']);
        expect(error1.strict).to.be.true;
        expect(error2[0]).to.be.undefined;
    });

    it('should not set options if errorFormat.$options is false', function() {
        validators.add('isEqual', function(value, arg, options) {
            if (value !== options.arg) {
                return 'not equal';
            }
        }, {
            errorFormat: {
                $options: false
            }
        });

        const error = validators.isEqual(1, 2, {'strict': true});
        expect(error.strict).to.be.undefined;
    });

    it('should set error fields to message if errorFormat.$origin is true', function() {
        validators.add('isEqual', function(value, arg, options) {
            if (value !== options.arg) {
                return { text: 'not equal' };
            }
        }, {
            errorFormat: {
                $origin: true
            }
        });

        const error = validators.isEqual(1, 2);
        expect(error.text).to.equal('not equal');
    });

    it('should not set error fields to message if errorFormat.$origin is false', function() {
        validators.add('isEqual', function(value, arg, options) {
            if (value !== options.arg) {
                return { text: 'not equal' };
            }
        }, {
            errorFormat: {
                $origin: false
            }
        });

        const error = validators.isEqual(1, 2);
        expect(error.text).to.be.undefined;
    });
});

describe('validator', function() {

    beforeEach(function() {
        validators = Validators();
    });

    it('should validate', function() {
        validators.add('isEqual', function(value, arg) {
            if (value !== arg) {
                return 'not equal';
            }
        });

        const valid = validators.isEqual(1, 1);
        expect(valid).to.be.undefined;

        const invalid = validators.isEqual(1, 2);
        expect(invalid.message).to.equal('not equal');
        expect(invalid.error).to.equal('isEqual');
        expect(invalid.arg).to.equal(2);
    });

    it('options should be an object', function() {
        validators.add('isValid', function(value, options) {
            if (({}).toString.call(options) !== '[object Object]') {
                return 'invalid';
            }
        });

        expect(validators.isValid(1)).to.be.undefined;
        expect(validators.isValid(1, null)).to.be.undefined;
        expect(validators.isValid(1, true)).to.be.undefined;
        expect(validators.isValid(1, false)).to.be.undefined;
        expect(validators.isValid(1, {})).to.be.undefined;
    });

    it('options should be an arg', function() {
        validators.add('isValid', function(value, options) {
            if (({}).toString.call(options) === '[object Object]') {
                return 'invalid';
            }
        });

        expect(validators.isValid(1, 0)).to.be.undefined;
        expect(validators.isValid(1, '')).to.be.undefined;
        expect(validators.isValid(1, [])).to.be.undefined;
        expect(validators.isValid(1, /regexp/)).to.be.undefined;
    });

    it('should set arg to options', function() {
        validators.add('isValid', function(value, arg, options) {
            if (options.arg !== 2) {
                return 'invalid';
            }
        });

        expect(validators.isValid(1, 2)).to.be.undefined;
    });

    it('value should be enabled for string format', function() {
        validators.add('isValid', function(value) {
            return '%{value}';
        });

        const error = validators.isValid(1);
        expect(error.message).to.equal('1');
    });

    it('arg should be enabled for string format', function() {
        validators.add('isValid', function(value) {
            return '%{arg}';
        });

        const error = validators.isValid(1, 2);
        expect(error.message).to.equal('2');
    });

    it('custom option should be enabled for string format', function() {
        validators.add('isValid', function(value) {
            return '%{myOption}';
        });

        const error = validators.isValid(1, {myOption: 3});
        expect(error.message).to.equal('3');
    });

    it('should prepare value by parse', function() {
        validators.add('isEqual', function(value, arg, options) {
            if (value !== options.arg) {
                return 'not equal';
            }
        });

        const parse = function(value) {
            return ++value;
        };

        const error = validators.isEqual(1, 2, {parse: parse});
        expect(error).to.be.undefined;
    });

    it('validators should be enabled in this', function() {
        validators.add('isValid', function(value) {
            return 'invalid'
        });

        validators.add('myValidator', function(value) {
            return this.isValid(value);
        });

        const error = validators.myValidator(1);
        expect(error.error).to.equal('isValid');
        expect(error.message).to.equal('invalid');
    });

    it('should work with alias', function() {
        validators.add('valid', 'isValid');
        validators.add('isValid', function(value) {
            return 'invalid'
        });

        const error = validators.valid();
        expect(error.error).to.equal('valid');
        expect(error.message).to.equal('invalid');
    });

    it('should work with complex validator with aliases', function() {
        validators.add({
            isValid: function(value) {
                return 'invalid'
            },
            valid: 'isValid',
            myValidator: ['valid', function(value) {
                return 'OK'
            }]
        });

        const error = validators.myValidator();
        expect(error.error).to.equal('valid');
        expect(error.message).to.equal('invalid');
    });

    it('should work with complex validator with objects', function() {
        validators.add({
            isValid: function(value, options) {
                if (options.strict) {
                    return 'invalid'
                }
            },
            valid: 'isValid',
            myValidator: [['valid', {strict: true}], function(value) {
                return 'OK'
            }]
        });

        const error = validators.myValidator();
        expect(error.error).to.equal('valid');
        expect(error.message).to.equal('invalid');
    });

    it('should work with complex validator with objects and arg', function() {
        validators.add({
            isValid: function(value, arg, options) {
                if (options.strict) {
                    return 'invalid'
                }
            },
            valid: 'isValid',
            myValidator: [['valid', {strict: true}], function(value) {
                return 'OK'
            }]
        });

        const error = validators.myValidator(null, 1, null);
        expect(error.error).to.equal('valid');
        expect(error.message).to.equal('invalid');
    });

    it('should override error field in object', function() {
        validators.add('isValid', function(value) {
            return {
                error: 'errorKey',
                message: 'validatorMessage'
            }
        });

        const error = validators.isValid(1);
        expect(error.error).to.equal('errorKey');
        expect(error.message).to.equal('validatorMessage');
    });

    it('should override error message string', function() {
        validators.add('isValid', function(value) {
            return 'validatorMessage'
        });

        const error = validators.isValid(1, {message: 'overridedMessage'});
        expect(error.message).to.equal('overridedMessage');
    });

    it('should override error message object', function() {
        validators.add('isValid', function(value) {
            return {
                error: 'errorKey',
                message: 'validatorMessage'
            }
        });

        const error = validators.isValid(1, {message: 'overridedMessage'});
        expect(error.error).to.equal('isValid');
        expect(error.message).to.equal('overridedMessage');
    });

    it('should pass arguments in validator', function() {
        validators.add('isValid', function(value) {
            return {
                message: arguments
            };
        });

        const error = validators.isValid(1, {}, 3, 4);
        expect(Array.prototype.slice.call(error.message)).to.deep.equal([1, {}, 3, 4]);
    });

    it('should pass arguments and arg in validator', function() {
        validators.add('isValid', function(value) {
            return {
                message: arguments
            };
        });

        const error = validators.isValid(1, 2, null, 4);
        expect(Array.prototype.slice.call(error.message)).to.deep.equal([1, 2, {arg: 2}, 4]);
    });

    it('should work without this', function() {
        validators.add('isValid', function(value) {
            if (typeof this.isValid === 'function') {
                return 'invalid';
            }
        });

        validators.add('valid', 'isValid');

        const error = validators.valid.call(null);
        expect(error.error).to.equal('valid');
        expect(error.message).to.equal('invalid');
    });

    it('should redefine validation result', function() {
        const myValidators = {
            exist: function(value) {
                return !!value;
            }
        };

        validators.add(myValidators, {
            resultHandler: function(result) {
                if (!result) {
                    return '%{value} is not %{validator}'
                }
            }
        });

        const error = validators.exist(null);
        expect(error.error).to.equal('exist');
        expect(error.message).to.equal('null is not exist');
    });

    it('should show exception in message through exceptionHandler', function() {
        validators.add('minLength', function(value, arg) {
            return value.length >= arg;
        }, {
            exceptionHandler: function(err) {
                return err;
            }
        });

        var error = validators.minLength(null, 5);
        expect(error.error).to.equal('minLength');
        expect(error.message).to.equal('Cannot read property \'length\' of null');
    });

    it('should redefine exception handler', function() {
        const myValidators = {
            minLength: function(value, arg) {
                return value.length >= arg;
            },
            maxLength: function(value, arg) {
                return value.length <= arg;
            }
        };

        validators.add('minLength', myValidators.minLength, {
            exceptionHandler: function (err) {}
        });

        validators.add('maxLength', myValidators.maxLength, {
            exceptionHandler: 'none'
        });

        var error = validators.minLength(null, 5);
        expect(error).to.be.undefined;

        try {
            validators.maxLength(null, 5);
        } catch(err) {
            expect(err).to.be.instanceof(TypeError);
        }
    });

    it('should to do carrying by curry method', function() {
        validators.add('min', function(value, arg, options) {
            if (value < arg) {
                return 'Error'
            }
        });

        var minThenFive = validators.min.curry(5);

        expect(minThenFive(6)).to.be.undefined;
        expect(minThenFive(1)).to.have.property('message');
    });

    it('should use error params in the placeholder of overridden message', function() {
        validators.add('min', function(value, arg, options) {
            if (value < arg) {
                return {
                    message: 'Error',
                    smth: 'X'
                }
            }
        });

        var error = validators.min(4, 5, {message: 'Error %{smth}'});

        expect(error.message).to.equal('Error X');
    });

    it('should use simple arguments format', function() {
        validators.add('min', function(value, options, settings) {
            if (typeof options === 'object' && settings.showError) {
                return 'Error %{arg}'
            }
        }, {
            simpleArgsFormat: true
        });

        const error1 = validators.min(4, 5, {showError: true});
        const error2 = validators.min(4, {v: 5}, {showError: true});
        const error3 = validators.min(4, {arg: 5, v: 2}, {showError: true});

        expect(error1.message).to.equal('Error 5');
        expect(error2.message).to.equal('Error undefined');
        expect(error3.message).to.equal('Error 5');
        expect(error1.showError).to.be.undefined;
        expect(error2.showError).to.be.undefined;
        expect(error3.showError).to.be.undefined;
    });

    it('should understand error in the promise', function() {
        validators.add('existsInDatabase', function(value, options, settings) {
            return Promise.resolve('%{value} does not exist');
        });

        const promise = validators.existsInDatabase('TEST');

        return expect(promise).to.be.fulfilled.then(error => {
            expect(error.error).to.equal('existsInDatabase');
            expect(error.message).to.equal('TEST does not exist');
        });
    });
});