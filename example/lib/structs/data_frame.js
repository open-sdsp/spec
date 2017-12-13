"use strict";

const Utilities = require('../utilities');
const Exceptions = require('../exceptions');
const utility = new Utilities();

/*
  DataFrame is the

  Attributes:
    - uid: String (required)
    - serial: Int (required)
    - ver: Int (required)
    - delta: Object
    - alg: String
    - data: Object or any primitive
    - dataUri: URI
    - historyUri: URI
    - checksum: { val: String, type: String }
    - meta: Object
*/
class DataFrame {
  constructor(attributes) {
    if (typeof(attributes) !== 'object') {
      throw new Exceptions.ArgumentException(`attributes argument is of the wrong type. Expecting an object`);
    }

    this.uid = utility.pluckAndvalidateAttr('uid', attributes, 'String', true);
    this.serial = utility.pluckAndvalidateAttr('serial', attributes, 'Int', true);
    this.ver = utility.pluckAndvalidateAttr('ver', attributes, 'Int') || 0;
    this.delta = utility.pluckAndvalidateAttr('delta', attributes, 'any');
    this.alg = utility.pluckAndvalidateAttr('alg', attributes, 'String');
    this.data = utility.pluckAndvalidateAttr('data', attributes, 'any');
    this.dataUri = utility.pluckAndvalidateAttr('dataUri', attributes, 'URI');
    this.historyUri = utility.pluckAndvalidateAttr('historyUri', attributes, 'URI');

    validate(this);
  }
}

/*
 * Validation of the DataFrame object where logic for validation goes beyond
 *   simple attribute isolated validation
 */
function validate(dataFrame) {
  if (!dataFrame.alg && (dataFrame.data || dataFrame.dataUri)) {
    throw new Exceptions.ArgumentException(`Attribute alg is required for a DataFrame with a data or dataUri attribute`);
  }
}

module.exports = DataFrame;
