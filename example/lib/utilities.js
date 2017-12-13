"use strict";

const Exceptions = require('./exceptions');
const URL = require('url');

class Utilities {
  pluckAndvalidateAttr(name, attributes, type, required) {
    let val = attributes[name];
    let valEmpty = (val === null) || (typeof(val) === 'undefined');

    if (!required && valEmpty) { return; }

    if (required && valEmpty) {
      throw new Exceptions.ArgumentException(`Attribute ${name} is required yet is empty`);
    }

    switch(type.toString().toLowerCase()) {
      case 'string':
        if (typeof(val) !== 'string') {
          throw new Exceptions.ArgumentException(`Attribute ${name} was expected to be a String. Type was ${typeof(val)}`);
        }
        return val;
      case 'int':
        if (typeof(val) !== 'number') {
          throw new Exceptions.ArgumentException(`Attribute ${name} was expected to be an Integer. Type was ${typeof(val)}`);
        }
        if (val.toString().match(/\d+\.\d+/)) {
          throw new Exceptions.ArgumentException(`Attribute ${name} was expected to be an Integer. Numeric value had a decimal part: ${val}`);
        }
        return val;
      case 'uri':
        {
          let url;
          if (typeof(val) !== 'string') {
            throw new Exceptions.ArgumentException(`Attribute ${name} was expected to be a URI String. Type was ${typeof(val)}`);
          }
          try {
            url = URL.parse(val);
            if (!url.protocol) { throw new Exceptions.ArgumentException(`Attribute URI ${name} is incomplete as it is missing the protocol part`); }
            if (!url.host) { throw new Exceptions.ArgumentException(`Attribute URI ${name} is incomplete as it is missing the host part`); }
          } catch (exception) {
            throw new Exceptions.ArgumentException(`Attribute ${name} is not a valid URL. Error: ${exception.message}`);
          }
        }
        return val;
      case 'any':
        return val;
      default:
        throw new Exceptions.ArgumentException(`Attribute ${name} expected type is unknown '${type}'`);
    }
  }
}

module.exports = Utilities;
