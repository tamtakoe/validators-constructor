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

    it('options should be an object anyway', function() {
        validators.add('isValid', function(value, options) {
            expect(options).to.be.object;
        });

        validators.isValid();

    });

    it('should set comparedValue to options', function() {
        validators.add('isEqual', function(value, comparedValue, options) {
            if (value !== options.comparedValue) {
                return 'not equal';
            }
        });

        const valid = validators.isEqual(1, 1);
        expect(valid).to.be.undefined;
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

        const valid = validators.isEqual(1, 2, {parse: parse});
        expect(valid).to.be.undefined;
    });
});