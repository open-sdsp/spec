"use strict";

/* SDSP Base Exception */
class Exception {
  constructor(message, code) {
    this.message = message;
    this.code = code;
  }

  toString() {
    return `<SDSP.Exception> Error code: ${code}, message: ${message}`;
  }
}

exports.ArgumentException = class extends Exception {
  constructor(message) { super(message, 400); }
}

