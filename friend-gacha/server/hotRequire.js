const path = require('path');
const dataDir = path.join(__dirname, '..', 'data');

module.exports = function hotRequire(name) {
  const absPath = require.resolve(path.join(dataDir, name));
  delete require.cache[absPath];
  return require(absPath);
};
