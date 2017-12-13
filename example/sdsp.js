"use strict";

const DataFrame = require('./lib/structs/data_frame');

class SDSP {

}

new DataFrame({
  uid: 'foo',
  serial: 2,
  dataUri: 'http://foo.com',
  data: { foo: 'bar' },
  alg: 'foo',
})
