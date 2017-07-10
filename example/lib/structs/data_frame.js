"use strict";

const utilities = new require('../utilities');

class DataFrame {
  constructor(attributes) {
    this.uid = utilities.checkAttr('uid', attributes.uid, 'String', true);
  }
  /*
  uid: String
  serial: Int
  ver: Int
  delta: Object
  alg: String
  data: Object
  dataUri: URI
  historyUri: URI
  checksum: { val: String, type: String }
  meta: Object
  */
}

exports = DataFrame;
