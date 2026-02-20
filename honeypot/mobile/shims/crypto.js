// Crypto shim for React Native — provides randomUUID and getRandomValues
// which axios needs for request IDs

module.exports = {
  randomUUID: function() {
    if (globalThis.crypto && globalThis.crypto.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    // Fallback UUID v4 generation
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  getRandomValues: function(arr) {
    if (globalThis.crypto && globalThis.crypto.getRandomValues) {
      return globalThis.crypto.getRandomValues(arr);
    }
    for (var i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  },
};
