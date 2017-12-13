require('jasmine');

const Exceptions = require('../lib/exceptions');

describe('DataFrame', () => {
  context('constructor', () => {
    it('requires attributes to be an object', () => {
      expect(DataFrame.new()).to.throw(Exceptions.ArgumentException, /wrong type/)
    });

    it('requires a uid', () => {
      expect(DataFrame.new({})).to.throw(Exceptions.ArgumentException, /uid is required/)
    });

    it('requires a uid String', () => {
      expect(DataFrame.new({ uid: 1 })).to.throw(Exceptions.ArgumentException, /uid.*expected.*String/)
    });

    it('requires a serial', () => {
      expect(DataFrame.new({ uid: 'foo' })).to.throw(Exceptions.ArgumentException, /serial is required/)
    });

    it('requires a serial Integer', () => {
      expect(DataFrame.new({ uid: 'foo', serial: 'string' })).to.throw(Exceptions.ArgumentException, /serial.*expected.*Integer/)
    });

    it('requires a ver', () => {
      expect(DataFrame.new({ uid: 'foo' })).to.throw(Exceptions.ArgumentException, /ver is required/)
    });

    it('requires a ver Integer', () => {
      expect(DataFrame.new({ uid: 'foo', serial: 1, ver: 'string' })).to.throw(Exceptions.ArgumentException, /ver.*expected.*Integer/)
    });
  });
});
