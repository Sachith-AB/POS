module.exports = async function () {
  // Custom sign handler bypasses code signing
  return true;
};
module.exports.default = module.exports;
