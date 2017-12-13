"use strict";

/* SDSP Base Exception */
class Exception {
  constructor(message, code) {
    this.message = message;
    this.code = code;
  }

  toString() {
    return `<SDSP.Exception> Error code: ${this.code}, message: ${this.message}`;
  }
}

module.exports.ArgumentException = class extends Exception {
  constructor(message) { super(message, 400); }
}

