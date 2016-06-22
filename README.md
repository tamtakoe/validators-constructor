# validators-constructor
Constructor for library of validators

[![NPM version](https://img.shields.io/npm/v/validators-constructor.svg)](https://npmjs.org/package/validators-constructor)
[![Build status](https://img.shields.io/travis/tamtakoe/validators-constructor.svg)](https://travis-ci.org/tamtakoe/validators-constructor)

**Note:** This module works in browsers and Node.js >= 4.0

## Installation

```sh
npm install validators-constructor
```

## Usage

```js
const Validators = require('validators-constructor');
const validators = Validators();

validators.load({
    //Simple validator
    maxLength: function(value, comparedValue, options) {
        //if you use `comparedValue` you must specify `options` argument even if it do not use
        //comparedValue also is available as options.comparedValue

        if ((isString(value) || isArray(value)) && value.length > comparedValue) {
            return 'is too long (maximum is %{comparedValue})';
        }
    },
    lengthMax: 'maxLength', //alias for `maxLength`

    //Validate by several params
    range: function(value, options) {
        var typeNumberError = this.number(value) //you can find any validator in `this`

        if (typeNumberError) {
            return typeNumberError; //returns error message of `number` validator
        }

        if (value > options.to) {
            return {
                error: 'range.many', //error is key. It should be unique
                message: options.manyMessage || 'is too many (should be from %{from} to %{to})',
                description: 'Make your number less' //You can use extra fields
            }
        }

        if (value < options.from) {
            return {
                error: 'range.less',
                message: options.lessMessage || 'is too less (should be from %{from} to %{to})',
                description: 'Make your number greater'
            }
        }
    },

    //Chain of validators
    minStrict: ['required', {validator: 'number', options: {strict: true}}, function(val, cVal, opts) {
        if (value < comparedValue) {
            return 'is too short (minimum is %{comparedValue})';
        }
    }],
});

validators.lengthMax('abc', 2);
/* returns:
{
    message: 'is too long (maximum is 2)',
    error: 'lengthMax',
    comparedValue: 2
}
*/

validators.range(7, {from: 1, to: 5, lessMessage: 'is too less', manyMessage: 'is too many'});
/* returns (options end in `Message` are not in the result):
{
    description: 'Make your number less',
    message: 'is too many',
    error: 'range.many',
    from: 1,
    to: 5
}
*/

validators.minStrict(null, 3);
/* returns:
{
    message: 'can\'t be blank',
    error: 'required'
}
*/
```

## API

### Validators([options])

- **options** (`Object`)
  * `formatStr` (`Function`) - Custom template parser. *get* `(templateStr, variablesObj)`. *return* `str`
  * `errorFormat` (`Object`) - Output format of error. By default:
```js
{
    error: '%{validator}',
    message: '%{message}',
    $options: true,
    $origin: true
}
```
You can use %{template} syntax (by default). Next variables are enabled:
`validator` - validator name. f.e. `maxLength`;
`message` - string which validator returns if error;
options which you set in validator `options` if `$options: true`;
options which validator returns instead string (except options that end in `Message`) if `$origin: true`


- **return** (`Validators`) instance of Validators


### validators.add(validatorName, validatorFn)

- **validatorName** (`String`) - Name of validator in validators instance

- **validatorFn** (`Function` or `String` or `Array`) - Validator or alias or validators array



### validators.load(validatorsObj)

- **validatorsObj** (`Object`) - Object has structure `{validatorName: validatorFn, ...}`



### validatorFn(value, [comparedValue], [options])

- **value** (`Any`) - Validated value

- **comparedValue** (`Any`) - value for comparison. User can set it as `options.comparedValue`

- **options** (`Object`) - options
  * `comparedValue` (`Any`) - Will be set if comparedValue is specified
  * `message` (`Any`) - Override error message
  * `parse` (`Function`) - Can change input value before validation
  * (`Any`) - Any custom options

- **return** (`Any`) - `undefined` if valid or error message. You can use %{template} syntax in message strings (validated value enable as `value`)


## Tests

```sh
npm install
npm test
```

## License

[MIT](LICENSE)
