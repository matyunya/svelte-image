const svelte = require("svelte/compiler");
const sharp = require("sharp");
const path = require("path");
const util = require("util");
const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");
const blurhash = require('blurhash');

const defaults = {
  optimizeAll: true, // optimize all images discovered in img tags

  // Case insensitive. Only files whose extension exist in this array will be
  // processed by the <img> tag (assuming `optimizeAll` above is true). Empty
  // the array to allow all extensions to be processed. However, only jpegs and
  // pngs are explicitly supported.
  imgTagExtensions: ["jpg", "jpeg", "png"],

  // Same as the above, except that this array applies to the Image Component.
  // If the images passed to your image component are unknown, it might be a
  // good idea to populate this array.
  componentExtensions: [],

  inlineBelow: 10000, // inline all images in img tags below 10kb

  compressionLevel: 8, // png quality level

  quality: 70, // jpeg/webp quality level

  tagName: "Image", // default component name

  sizes: [400, 800, 1200], // array of sizes for srcset in pixels

  // array of screen size breakpoints at which sizes above will be applied
  breakpoints: [375, 768, 1024],

  outputDir: "g/",

  publicDir: "./static/",

  placeholder: "trace", // or "blur", or "blurhash",
  
  placeholderSize: 64,

  // WebP options [sharp docs](https://sharp.pixelplumbing.com/en/stable/api-output/#webp)
  webpOptions: {
    quality: 75,
    lossless: false,
    force: true,
  },

  webp: true,

  // Potrace options for SVG placeholder
  trace: {
    background: "#fff",
    color: "#002fa7",
    threshold: 120,
  },

  // Wheter to download and optimize remote images loaded from a url
  optimizeRemote: true,

  //
  // Declared image folder processing
  //
  // The options below are only useful if you'd like to process entire folders
  // of images, regardless of whether or not they appear in any templates in
  // your application (in addition to all the images that are found at build
  // time). This is useful if you build dynamic strings to reference images you
  // know should exist, but that cannot be determined at build time.

  // Relative paths (starting from `/static`) of folders you'd like to process
  // from top to bottom. This is a recursive operation, so all images that match
  // the `processFoldersExtensions` array will be processed. For example, an
  // array ['folder-a', 'folder-b'] will process all images in
  // `<publicDir>/folder-a/` and `<publicDir>/folder-b`.
  processFolders: [],

  // When true, the folders in the options above will have all subfolders
  // processed recursively as well.
  processFoldersRecursively: false,

  // Only files with these extensions will ever be processed when invoking
  // `processFolders` above.
  processFoldersExtensions: ["jpeg", "jpg", "png"],

  // Add image sizes to this array to create different asset sizes for any image
  // that is processed using `processFolders`
  processFoldersSizes: false
};

/**
 * @type {typeof defaults}
 */
let options = JSON.parse(JSON.stringify(defaults))

async function downloadImage(url, folder = ".") {
  const hash = crypto.createHash("sha1").update(url).digest("hex");
  const existing = fs.readdirSync(folder).find((e) => e.startsWith(hash));
  if (existing) {
    return existing;
  }

  const { headers } = await axios.head(url);

  const [type, ext] = headers["content-type"].split("/");
  if (type !== "image") return null;

  const filename = `${hash}.${ext}`;
  const saveTo = path.resolve(folder, filename);

  if (fs.existsSync(path)) return filename;

  const writer = fs.createWriteStream(saveTo);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", () => resolve(filename));
    writer.on("error", reject);
  });
}

function getPathsObject(nodeSrc) {
  const inPath = path.resolve(options.publicDir, nodeSrc);
  const outDir = path.dirname(
    path.resolve(options.publicDir, options.outputDir, nodeSrc)
  );
  const filename = path.basename(inPath);
  const outUrl = path.relative(options.publicDir, path.join(outDir, filename));

  return {
    inPath,
    outDir,
    outPath: path.join(outDir, filename),
    outUrl,
    getResizePaths: (size) => {
      const filenameWithSize = getFilenameWithSize(inPath, size);
      return {
        outPath: path.join(outDir, filenameWithSize),
        outUrl: path.join(path.dirname(outUrl), filenameWithSize),
        outPathWebp: path.join(outDir, getWebpFilenameWithSize(inPath, size)),
      };
    },
  };
}

async function getBase64(pathname, inlined = false) {
  let size = options.placeholderSize;

  if (inlined) {
    size = (await sharp(pathname).metadata()).size;
  }

  const s = await sharp(pathname).resize(size).toBuffer();

  return "data:image/png;base64," + s.toString("base64");
}

const optimizeSVG = (svg) => {
  const svgo = require(`svgo`);
  const res = new svgo({
    multipass: true,
    floatPrecision: 0,
    datauri: "base64",
  });

  return res.optimize(svg).then(({ data }) => data);
};

async function getTrace(pathname) {
  const potrace = require("potrace");
  const trace = util.promisify(potrace.trace);

  const s = await sharp(pathname)
    .resize(options.trace.size || 500)
    .toBuffer();

  const res = await trace(s, options.trace);

  return optimizeSVG(res);
}

function getProp(node, attr) {
  const prop = (node.attributes || []).find((a) => a.name === attr);
  return prop ? prop.value : undefined;
}

function getSrc(node) {
  try {
    return getProp(node, "src") || [{}];
  } catch (err) {
    console.log("Was unable to retrieve image src", err);
    return [{}];
  }
}

// Checks beginning of string for double leading slash, or the same preceeded by
// http or https
const IS_EXTERNAL = /^(https?:)?\/\//i;

/**
 * Returns a boolean indicating if the filename has one of the extensions in the
 * array. If the array is empty, all files will be accepted.
 *
 * @param {string} filename the name of the image file to be parsed
 * @param {Array<string>} extensions Either of options.imgTagExtensions or
 * options.componentExtensions
 * @returns {boolean}
 */
function fileHasCorrectExtension(filename, extensions) {
  return extensions.length === 0
    ? true
    : extensions
        .map((x) => x.toLowerCase())
        .includes(filename.split(".").pop().toLowerCase());
}

function willNotProcess(reason) {
  return {
    willNotProcess: true,
    reason,
    paths: undefined,
  };
}

function willProcess(nodeSrc) {
  return {
    willNotProcess: false,
    reason: undefined,
    paths: getPathsObject(nodeSrc),
  };
}

async function getProcessingPathsForNode(node) {
  const [value] = getSrc(node);

  // dynamic or empty value
  if (value.type === "MustacheTag" || value.type === "AttributeShorthand") {
    return willNotProcess(`Cannot process a dynamic value: ${value.type}`);
  }
  if (!value.data) {
    return willNotProcess("The `src` is blank");
  }
  if (
    node.name === "img" &&
    !fileHasCorrectExtension(value.data, options.imgTagExtensions)
  ) {
    return willNotProcess(
      `The <img> tag was passed a file (${
        value.data
      }) whose extension is not one of ${options.imgTagExtensions.join(", ")}`
    );
  }
  if (
    node.name === options.tagName &&
    !fileHasCorrectExtension(value.data, options.componentExtensions)
  ) {
    return willNotProcess(
      `The ${options.tagName} component was passed a file (${
        value.data
      }) whose extension is not one of ${options.componentExtensions.join(
        ", "
      )}`
    );
  }

  // TODO:
  // resolve imported path
  // refactor externals

  let removedDomainSlash;
  if (IS_EXTERNAL.test(value.data)) {
    if (!options.optimizeRemote) {
      return willNotProcess(`The \`src\` is external: ${value.data}`);
    } else {
      removedDomainSlash = await downloadImage(
        value.data,
        options.publicDir
      ).catch((e) => {
        console.error(e.toString());

        return null;
      });

      if (removedDomainSlash === null) {
        return willNotProcess(`The url of is not an image: ${value.data}`);
      }
    }
  } else {
    removedDomainSlash = value.data.replace(/^\/([^\/])/, "$1");
  }

  const fullPath = path.resolve(options.publicDir, removedDomainSlash);

  if (fs.existsSync(fullPath)) {
    return willProcess(removedDomainSlash);
  } else {
    return willNotProcess(`The image file does not exist: ${fullPath}`);
  }
}

function getBasename(p) {
  return path.basename(p, path.extname(p));
}

function getRelativePath(p) {
  return path.relative(options.publicDir, p);
}

function getFilenameWithSize(p, size) {
  return `${getBasename(p)}-${size}${path.extname(p)}`;
}

function getWebpFilenameWithSize(p, size) {
  return `${getBasename(p)}-${size}.webp`;
}

function ensureOutDirExists(outDir) {
  mkdirp(path.join(options.publicDir, getRelativePath(outDir)));
}

function insert(content, value, start, end, offset) {
  return {
    content:
      content.substr(0, start + offset) + value + content.substr(end + offset),
    offset: offset + value.length - (end - start),
  };
}

async function createSizes(paths) {
  const smallestSize = Math.min(...options.sizes);
  const meta = await sharp(paths.inPath).metadata();
  const sizes = smallestSize > meta.width ? [meta.width] : options.sizes;

  return (
    await Promise.all(sizes.map((size) => resize(size, paths, meta)))
  ).filter(Boolean);
}

async function resize(size, paths, meta = null) {
  if (!meta) {
    meta = await sharp(paths.inPath).metadata();
  }
  const { outPath, outUrl, outPathWebp } = paths.getResizePaths(size);

  if (meta.width < size) return null;

  ensureOutDirExists(paths.outDir);

  if (options.webp && !fs.existsSync(outPathWebp)) {
    await sharp(paths.inPath)
      .resize({ width: size, withoutEnlargement: true })
      .webp(options.webpOptions)
      .toFile(outPathWebp);
  }

  if (fs.existsSync(outPath)) {
    return {
      ...meta,
      filename: outUrl,
      size,
    };
  }

  return {
    ...meta,
    ...(await sharp(paths.inPath)
      .resize({ width: size, withoutEnlargement: true })
      .jpeg({
        quality: options.quality,
        progressive: false,
        force: false,
      })
      .png({ compressionLevel: options.compressionLevel, force: false })
      .toFile(outPath)),
    size,
    filename: outUrl,
  };
}

// Pass a string, then it will call itself with an array
function mkdirp(dir) {
  if (typeof dir === "string") {
    if (fs.existsSync(dir)) {
      return dir;
    }
    return mkdirp(dir.split(path.sep));
  }

  return dir.reduce((created, nextPart) => {
    const newDir = path.join(created, nextPart);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir);
    }
    return newDir;
  }, "");
}

const pathSepPattern = new RegExp("\\" + path.sep, "g");

const srcsetLine = (options) => (s, i) =>
  `${s.filename.replace(pathSepPattern, "/")} ${options.breakpoints[i]}w`;

const srcsetLineWebp = (options) => (s, i) =>
  `${s.filename.replace(pathSepPattern, "/")} ${options.breakpoints[i]}w`
    .replace("jpg", "webp")
    .replace("png", "webp")
    .replace("jpeg", "webp");

function getSrcset(sizes, lineFn = srcsetLine, tag = "srcset") {
  const s = Array.isArray(sizes) ? sizes : [sizes];
  const srcSetValue = s
    .filter((f) => f)
    .map(lineFn(options))
    .join();

  return ` ${tag}=\'${srcSetValue}\' `;
}

async function getImageData(pathname) {
  const img = await sharp(pathname);
  const meta = await img.metadata();
  const width = options.placeholderSize;
  const height = Math.floor(meta.height * (width / meta.width));

  return new Promise((resolve, reject) => {
    img.raw().ensureAlpha().resize(width, height).toBuffer((err, buffer, { width, height }) => {
      if (err) {
        return reject(err);
      }

      return resolve({ data: new Uint8ClampedArray(buffer), width, height });
    });
  });
}

async function replaceInComponent(edited, node) {
  const { content, offset } = await edited;

  const { paths, willNotProcess, reason } = await getProcessingPathsForNode(
    node
  );

  if (willNotProcess) {
    console.error(reason);
    return { content, offset };
  }
  const sizes = await createSizes(paths);

  const [{ start, end }] = getSrc(node);

  let replaced;

  const base64 =
    options.placeholder === "blur" || options.placeholder === "blurhash"
      ? await getBase64(paths.inPath)
      : await getTrace(paths.inPath);

  replaced = insert(content, base64, start, end, offset);

  replaced = insert(
    replaced.content,
    getSrcset(sizes),
    end + 1,
    end + 2,
    replaced.offset
  );

  replaced = insert(
    replaced.content,
    ` ratio=\'${(1 / (sizes[0].width / sizes[0].height)) * 100}%\' `,
    end + 1,
    end + 2,
    replaced.offset
  );

  if (options.placeholder === "blurhash") {
    const imgdata = await getImageData(paths.inPath);
    const hash = blurhash.encode(imgdata.data, imgdata.width, imgdata.height, 4, 3);

    replaced = insert(
      replaced.content,
      ` blurhash=\'{\`${hash}\`}\' blurhashSize=\'{{width: ${imgdata.width}, height: ${imgdata.height}}}\' `,
      end + 1,
      end + 2,
      replaced.offset
    );
  }

  if (options.webp) {
    replaced = insert(
      replaced.content,
      getSrcset(sizes, srcsetLineWebp, "srcsetWebp"),
      end + 1,
      end + 2,
      replaced.offset
    );
  };

  return replaced;
}

async function optimize(paths) {
  const { size } = fs.statSync(paths.inPath);
  if (options.inlineBelow && size < options.inlineBelow) {
    return getBase64(paths.inPath, true);
  }

  ensureOutDirExists(paths.outDir);

  if (!fs.existsSync(paths.outPath)) {
    await sharp(paths.inPath)
      .jpeg({ quality: options.quality, progressive: false, force: false })
      .webp({ quality: options.quality, lossless: true, force: false })
      .png({ compressionLevel: options.compressionLevel, force: false })
      .toFile(paths.outPath);
  }

  return paths.outUrl;
}

async function replaceInImg(edited, node) {
  const { content, offset } = await edited;

  const { paths, willNotProcess } = await getProcessingPathsForNode(node);
  if (willNotProcess) {
    return { content, offset };
  }

  const [{ start, end }] = getSrc(node);

  try {
    const outUri = await optimize(paths);
    return insert(content, outUri, start, end, offset);
  } catch (e) {
    console.error(e);
    return { content, offset };
  }
}

async function replaceImages(content) {
  let ast;
  const imageNodes = [];

  if (!content.includes("<img") && !content.includes(`<${options.tagName}`)) return content;

  try {
    ast = svelte.parse(content);
  } catch (e) {
    console.error(e, "Error parsing component content");
  }

  svelte.walk(ast, {
    enter: (node) => {
      if (!["Element", "Fragment", "InlineComponent"].includes(node.type)) {
        return;
      }

      if (options.optimizeAll && node.name === "img") {
        imageNodes.push(node);
        return;
      }

      if (node.name !== options.tagName) return;
      imageNodes.push(node);
    },
  });

  if (!imageNodes.length) return content;

  const beforeProcessed = {
    content,
    offset: 0,
  };
  const processed = await imageNodes.reduce(async (edited, node) => {
    if (node.name === "img") {
      return replaceInImg(edited, node);
    }
    return replaceInComponent(edited, node);
  }, beforeProcessed);

  return processed.content;
}

/**
 * @param {string} pathFromStatic
 */
async function processImage(pathFromStatic) {
  const paths = getPathsObject(pathFromStatic);
  await optimize(paths);
  if (options.processFoldersSizes) {
    await createSizes(paths);
  }
  return;
}

/**
 * @param {string} folder (relative path from `publicDir`)
 */
function processFolder(folder) {
  // get images
  const files = fs.readdirSync(path.resolve(options.publicDir, folder));
  const images = files.filter(file =>
    options.processFoldersExtensions.includes(path.extname(file).substr(1))
  );

  // process
  const processingImages = images
    .map(filename => path.join(folder, filename))
    .map(processImage);

  // get folders and optionally recurse
  let processingFolders = [];

  if (options.processFoldersRecursively) {
    const folders = files.filter(fileOrFolder =>
      fs
        .lstatSync(path.resolve(options.publicDir, folder, fileOrFolder))
        .isDirectory()
    );
    processingFolders = folders.map(nestedFolder =>
      processFolder(path.join(folder, nestedFolder))
    );
  }

  return Promise.all(processingImages.concat(processingFolders));
}

function processFolders() {
  if (options.processFolders.length === 0) return;

  const inlineBelow = options.inlineBelow
  options.inlineBelow = 0

  const jobs = options.processFolders.map(processFolder);
  return Promise.all(jobs)
    .finally(() => (options.inlineBelow = inlineBelow));
}

/**
 * @param {Partial<typeof options>} opts
 */
function getPreprocessor(opts = {}) {
  options = {
    ...options,
    ...opts
  };

  let ran = false;
  async function processFoldersOnce() {
    if (ran) return;
    ran = true;

    await processFolders();
  }

  return {
    markup: async ({ content }) => {
      await processFoldersOnce();
      return {
        code: await replaceImages(content)
      };
    }
  };
}

module.exports = {
  defaults,
  replaceImages,
  getPreprocessor,
};
