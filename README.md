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
const validators = require('validators-constructor')();

validators.load({
    /* Simple validator */
    maxLength: function(value, arg, options) {
        //arg have to exist and can not be an object or true. Otherwise it will be options
        //arg also is available as options.arg

        if ((isString(value) || isArray(value)) && value.length > arg) {
            return 'is too long (maximum is %{arg})';
        }
    },
    lengthMax: 'maxLength', //alias for `maxLength`

    /* Validate by several params */
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

    /* Chain of validators */
    minStrict: ['required', ['number', {strict: true}], function(value, arg, opts) {
        if (value < arg) {
            return '%{value} is too short (minimum is %{arg})';
        }
    }],
});

validators.lengthMax('abc', 2);
/* returns:
{
    message: 'is too long (maximum is 2)',
    error: 'lengthMax',
    arg: 2
}
*/

validators.range(7, {from: 1, to: 5, lessMessage: 'is too less', manyMessage: 'is too many'});
/* returns (options which end in `Message` are not in the result):
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

Validator have to return error message if value is invalid and nothing in opposite case.
You can handle validation result in `resultHandler`. It is useful for third party validators

```js
const validatorJS = require('validator'); //https://github.com/chriso/validator.js
//These validators return true if valid, false in opposite case and can throw exception

validators.load(validatorJS, {
    resultHandler: function(result) {
        if (!result) {
            return '%{value} is not %{validator}'
        }
    },
    exceptionHandler: function(err) {
        return err;
    }
});

validators.isEmail('abc', 3);
/* returns:
{
    message: 'abc is not isEmail',
    error: 'isEmail'
}
*/

validators.isEmail(null, 3); //catch exception by default
/* returns:
{
    message: 'This library (validator.js) validates strings only',
    error: 'isEmail'
}
*/
```

## API

### Validators([params])

- **params** (`Object`)
  * arg (`String`) - name of argument for compared values. By default: `arg`
  * resultHandler (`Function` ) - handler of validation result. By default `function(result) { return result }`
  * exceptionHandler (`Function`) - handler of JS exceptions. By default: `null`, E.g.`function(err) { return err }` will return error message in standard format
  * formatStr (`Function`) - Custom template parser. *params:* `templateStr`, `variablesObj`. *returns:* `str`
  * errorFormat (`Object`) - Output format of error. By default:
```js
{
    error: '%{validator}',
    message: '%{message}',
    $options: true,
    $origin: true
}
```
Default formatStr function allows to use %{template} syntax. Next variables are enabled:
`validator` - validator name (e.g. maxLength);
`message` - string that is returned in case of error;
options which you set in validator options if `$options: true`;
options which validator returns instead string (except options that end in Message) if `$origin: true`


- **return** (`Validators`) new instance of Validators

```js
const validators = require('validators-constructor')({errorFormat: '%{message}'})
```

--

### validators.add(validatorName, validator, [params])

- **validatorName** (`String`) - Name of validator in validators instance

- **validator** (`Function` or `String` or `Array`) - Validator or alias or validators array
                                                      (e.g. ['validatorName', ['validatorName', {...options}], validatorFn])

- **params** (`Object`) validator params (see Validators params). Also you can set default 'message' in params

- **return** (`Validators`) instance of Validators

```js
validators.add('exists', function(value) {
    return !value && 'Should be';
})
```

--

### validators.load(validatorsObj)

- **validatorsObj** (`Object`) - Object has structure `{validatorName: validator, ...}`

- **params** (`Object`) validator params (see Validators params). Also you can set default 'message' in params

- **return** (`Validators`) instance of Validators

```js
validators.load({
    exists: function(value) {
        return !value && 'Should be';
    },
    notExists: function(value) {
        return value && 'Should not be';
    }
)
```

--

### validator(value, [arg], [options])

- **value** (`Any`) - Validated value

- **arg** (`Any`) - Value for comparison. Have to exist and can not be an object or boolean.
                    User can set it as `options.arg`.
                    If you use 'arg' in your validator you must be sure that user will specify this value

- **options** (`Object`) - Options
  * arg (`Any`) - Will be set if 'arg' is specified
  * message (`Any`) - Override error message
  * parse (`Function`) - Can change input value before validation
  * (`Any`) - Any custom options

- (`Any`) - Any custom arguments

- **return** (`Any`) - `undefined` if valid or error message. You can use %{template} syntax in message strings (validated value is enabled as `value`, compared value - as `comparedValue`)

```js
validators.exists(null); //'Should be'
```

--

### validator.curry([arg], [options])

- **arg, options, etc.** - see validator.

- **return** (`Function`) - function, which gets value and returns result of validation

```js
lessThen3 = validators.maxLength.curry(3);

lessThen3('1234') //Length should be less then 3
```



## Tests

```sh
npm install
npm test
```

## License

[MIT](LICENSE)
