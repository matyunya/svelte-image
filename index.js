const {defaults, replaceImages} = require('./main')
module.exports = 
/**
 * @param {Partial<typeof defaults>} options 
 */
function getPreprocessor(options = {}) {
  options = {
    ...defaults,
    ...options
  };

  return {
    markup: async ({ content }) => ({
      code: await replaceImages(content, options)
    })
  };
};
