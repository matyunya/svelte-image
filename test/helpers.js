const fs = require("fs");
const path = require("path");
const targetFolder = path.join(process.cwd(), "static");
const getPreprocessor = require("../src/index");
const { defaults } = require("../src/main")

/**
 * Test helper to populate files into the expected directory and will use files
 * from the dev/static folder so we don't need excess files checked into version
 * control.
 *
 * When using the actual file system, it is a very good idea to avoid running
 * your tests in parallel. This is why `--run-in-band` is a default flag when
 * you invoke `yarn test` in terminal.
 *
 * @param  {Record<string,string>} lookup object where property is the new path
 * for the created file relative from a './static' directory in the root of the
 * repository. The value of each property is the relative path of an actual file
 * from the actual `<this_repo>/dev/static` dircectory.
 *
 * @example
 * populateFiles({
 *   "new/path/to/image.jpg": "1.jpg",
 *   "myPng.png": "4.png",
 *   "another/new/path.jpeg": "1.jpg",
 *   // This one will be problematic: you should ensure file types match
 *   "incorrect.jpg": "4.png",
 * });
 *
 * // In the example above, 4 images are created in the `./static/` directory.
 * // Two are in a series of sub-folders, and one two are in the root of the
 * // directory. All files are just copies of either `1.jpg` or `4.png` from
 * // the `/dev/static` directory in this repo.
 *
 */
function populateFiles(lookup = {}) {
  if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);

  Object.keys(lookup).forEach(newPath => {
    const buffer = fs.readFileSync(path.join("./dev/static", lookup[newPath]));
    const newFileLocation = path.join(targetFolder, newPath);
    const newFileDir = path.dirname(newFileLocation);
    fs.mkdirSync(newFileDir, {
      recursive: true
    });
    fs.writeFileSync(newFileLocation, buffer);
  });
}

function cleanFiles() {
  return require("del")(["static"]);
}

/**
 * Convenience function to get directly at the main thing we will be testing
 * @param {*} options Same as the options you'd pass to getPreprocessor
 */
function getReplaceImages(options) {
  const preprocessor = getPreprocessor({...defaults, ...options});
  return str => preprocessor.markup({ content: str }).then(obj => obj.code);
}

module.exports = {
  cleanFiles,
  populateFiles,
  getReplaceImages
};
