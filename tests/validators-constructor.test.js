'use strict';

const expect = require('chai').expect;
const Validators = require('../src/validators-constructor');
let validators;

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

    it('should load validators', function() {
        validators.load({
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
});

describe('validator', function() {

    beforeEach(function() {
        validators = Validators();
    });

    it('should validate', function() {
        validators.add('isEqual', function(value, comparedValue, options) {
            if (value !== comparedValue) {
                return 'not equal';
            }
        });

        const valid = validators.isEqual(1, 1);
        expect(valid).to.be.undefined;

        const invalid = validators.isEqual(1, 2);
        expect(invalid.message).to.equal('not equal');
        expect(invalid.error).to.equal('isEqual');
        expect(invalid.comparedValue).to.equal(2);
    });

    it('options should be an object', function() {
        validators.add('isValid', function(value, options) {
            expect(options).to.be.object;
        });

        validators.isValid();

    });

    it('should set comparedValue to options', function() {
        validators.add('isValid', function(value, comparedValue, options) {
            expect(options.comparedValue).to.equal(2);
        });

        validators.isValid(1, 2);
    });

    it('value should be enabled for string format', function() {
        validators.add('isValid', function(value, comparedValue, options) {
            return '%{value}';
        });

        const error = validators.isValid(1);
        expect(error.message).to.equal('1');
    });

    it('comparedValue should be enabled for string format', function() {
        validators.add('isValid', function(value, comparedValue, options) {
            return '%{comparedValue}';
        });

        const error = validators.isValid(1, 2);
        expect(error.message).to.equal('2');
    });

    it('custom option should be enabled for string format', function() {
        validators.add('isValid', function(value, options) {
            return '%{myOption}';
        });

        const error = validators.isValid(1, {myOption: 3});
        expect(error.message).to.equal('3');
    });

    it('should prepare value by parse', function() {
        validators.add('isEqual', function(value, comparedValue, options) {
            if (value !== options.comparedValue) {
                return 'not equal';
            }
        });

        const parse = function(value) {
            return ++value;
        };

        const error = validators.isEqual(1, 2, {parse: parse});
        expect(error).to.be.undefined;
    });

    it('should work with alias', function() {
        validators.add('valid', 'isValid');
        validators.add('isValid', function(value, comparedValue, options) {
            return 'invalid'
        });

        const error = validators.valid();
        expect(error.error).to.equal('valid');
        expect(error.message).to.equal('invalid');
    });

    it('should work with complex validator with aliases', function() {
        validators.load({
            isValid: function(value, comparedValue, options) {
                return 'invalid'
            },
            valid: 'isValid',
            myValidator: ['valid', function(value, comparedValue, options) {
                return 'OK'
            }]
        });

        const error = validators.myValidator();
        expect(error.error).to.equal('valid');
        expect(error.message).to.equal('invalid');
    });

    it('should work with complex validator with objects', function() {
        validators.load({
            isValid: function(value, comparedValue, options) {
                if (options.strict) {
                    return 'invalid'
                }
            },
            valid: 'isValid',
            myValidator: [{validator: 'valid', options: {strict: true}}, function(value, comparedValue, options) {
                return 'OK'
            }]
        });

        const error = validators.myValidator();
        expect(error.error).to.equal('valid');
        expect(error.message).to.equal('invalid');
    });
});