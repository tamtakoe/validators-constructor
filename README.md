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
        //if you use comparedValue you must specify the options in arguments, even if they do not use
        //comparedValue also is available as options.comparedValue

        if ((isString(value) || isArray(value)) && value.length > comparedValue) {
            return 'is too long (maximum is %{comparedValue})';
        }
    },
    maxlength: 'maxLength', //alias for `maxLength`

    //Difficult validator (validate by several params)
    range: function(value, options) {
        if (isNumber(value)) {
            if (value > options.to) {
                return {
                    type: 'many',
                    message: options.manyMessage || 'is too many (should be from %{from} to %{to})'
                }

            } else if (value < options.from) {
                return {
                    type: 'less',
                    message: options.lessMessage || 'is too less (should be from %{from} to %{to})'
                }
            }
        }
    }
});

validators.maxlength('abc', 2);
/* returns:
{
    message: 'is too long (maximum is 2)',
    error: 'maxlength',
    comparedValue: 2
}
*/

validators.range(7, {from: 1, to: 5, lessMessage: 'is too less', manyMessage: 'is too many'});
/* returns (options end in `Message` are not in the result):
{
    type: 'many',
    message: 'is too many',
    error: 'range',
    from: 1,
    to: 5
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

- **validatorFn** (`Function` or `String`) - Validator or alias



### validators.load(validatorsObj)

- **validatorsObj** (`Object`) - Object has structure `{validatorName: validatorFn, ...}`



### validatorFn(value, [comparedValue], [options])

- **value** (`Any`) - Validated value

- **comparedValue** (`Any`) - value for comparison. User can set it as `options.comparedValue`

- **options** (`Object`) - If you is not Object you get option value in validator as `options.comparedValue`
  * `comparedValue` (`Any`) - Will be set if comparedValue is specified
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
