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
        validators.add('isEqual', function(value, options) {
            if (value !== options.comparedValue) {
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
});