"use strict";

const Exceptions = require('./exceptions');

class Utilities {
  checkAttr(name, val, type, required) {
    if (!required && ((val === null) || (typeof(val) === 'undefined'))) { return; }

    switch(type) {
      case 'String':
        if (typeof(val) !== 'String') {
          throw new Exceptions.ArgumentException(`Attribute ${val} was expected to be a String. Type was ${typeof(val)}`);
        }
        return val;
      case 'Int':
        if (typeof(val) !== 'Number') {
          throw new Exceptions.ArgumentException(`Attribute ${val} was expected to be an Int. Type was ${typeof(val)}`);
        }
        if (val.toString().match(/\d+\.\d+/)) {
          throw new Exceptions.ArgumentException(`Attribute ${val} was expected to be an Int. Numeric value had a decimal part: ${val}`);
        }
        return val;
      default:
        return val;
    }
  }
}

module.exports = Utilities;
