const svelte = require("svelte/compiler");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const defaults = {
  optimizeAll: true,
  inlineBelow: 10000,
  compressionLevel: 8,
  quality: 70,
  tagName: "Image",
  sizes: [400, 800, 1200],
  breakpoints: [375, 768, 1024],
  outputDir: "g/"
};

async function getBase64(pathname, inlined = false) {
  let size = 64;

  if (inlined) {
    size = await sharp(pathname).metadata();
  }

  const s = await sharp(pathname)
    .resize(size)
    .toBuffer();

  return "data:image/png;base64," + s.toString("base64");
}

function getProp(node, attr) {
  return node.attributes.find(a => a.name === attr).value;
}

function getPathname(node) {
  const [value] = getProp(node, "src");

  // dynamic or empty value
  if (
    value.type === "MustacheTag" ||
    value.type === "AttributeShorthand" ||
    !value.data
  ) {
    // TODO:
    // resolve imported path

    throw new Error("Can't process the image");
  }
  return path.resolve("./static/", value.data);
}

function getBasename(p) {
  return path.basename(p, path.extname(p));
}

function getFilename(p) {
  return path.basename(p);
}

function getFilenameWithSize(p, size) {
  return `${getBasename(p)}-${size}${path.extname(p)}`;
}

function insert(content, value, start, end, offset) {
  return {
    content:
      content.substr(0, start + offset) + value + content.substr(end + offset),
    offset: offset + value.length - (end - start)
  };
}

function resize(options, pathname) {
  return async size => {
    const filename = getFilenameWithSize(pathname, size);

    const dir = "./static/" + options.outputDir;
    const outPath = path.resolve(dir, filename);

    const meta = await sharp(pathname).metadata();

    if (meta.width < size) return null;

    if (fs.existsSync(outPath)) {
      return {
        ...meta,
        filename: options.outputDir + filename,
        size
      };
    }

    return {
      ...(await sharp(pathname)
        .resize({ width: size, withoutEnlargement: true })
        .jpeg({ quality: options.quality, progressive: true, force: false })
        .webp({ quality: options.quality, lossless: true, force: false })
        .png({ compressionLevel: options.compressionLevel, force: false })
        .toFile(outPath)),
      size,
      filename: options.outputDir + filename
    };
  };
}

function init(options) {
  const dir = "./static/" + options.outputDir;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

function getSrcset(sizes, options) {
  const srcSetValue = sizes
    .filter(f => f)
    .map((s, i) => `${s.filename} ${options.breakpoints[i]}w`)
    .join(",\n");

  return `srcset=\'${srcSetValue}\'`;
}

async function replaceInComponent(edited, node, options) {
  const { content, offset } = await edited;
  let pathname = "";

  try {
    pathname = getPathname(node);
  } catch (e) {
    return { content, offset };
  }

  const sizes = await Promise.all(options.sizes.map(resize(options, pathname)));

  const base64 = await getBase64(pathname);
  const [{ start, end }] = getProp(node, "src");

  const withBase64 = insert(content, base64, start, end, offset);

  return insert(
    withBase64.content,
    getSrcset(sizes, options),
    end + 1,
    end + 2,
    withBase64.offset
  );
}

async function optimize(p, options) {
  const inPath = path.resolve("./static/", getFilename(p));
  const outPath = path.resolve("./static/", options.outputDir, getFilename(p));
  const outUrl = options.outputDir + getFilename(p);

  const { size } = fs.statSync(inPath);
  if (options.inlineBelow && size < options.inlineBelow) {
    return getBase64(inPath, true);
  }

  await sharp(inPath)
    .jpeg({ quality: options.quality, progressive: true, force: false })
    .webp({ quality: options.quality, lossless: true, force: false })
    .png({ compressionLevel: options.compressionLevel, force: false })
    .toFile(outPath);

  return outUrl;
}

async function replaceInImg(edited, node, options) {
  const { content, offset } = await edited;
  let p = "";

  try {
    p = getPathname(node);
  } catch (e) {
    return { content, offset };
  }

  const [{ start, end }] = getProp(node, "src");

  const outUrl = await optimize(p, options);

  return insert(content, outUrl, start, end, offset);
}

async function replaceImages(content, options) {
  let ast;
  const imageNodes = [];

  try {
    ast = svelte.parse(content);
  } catch {}

  svelte.walk(ast, {
    enter: node => {
      if (options.optimizeAll && node.name === "img") {
        imageNodes.push(node);
        return;
      }

      if (node.name !== options.tagName) return;
      imageNodes.push(node);
    }
  });

  if (!imageNodes.length) return content;

  const beforeProcessed = {
    content,
    offset: 0
  };

  const processed = await imageNodes.reduce(async (edited, node) => {
    if (node.name === "img") {
      return replaceInImg(edited, node, options);
    }
    return replaceInComponent(edited, node, options);
  }, beforeProcessed);

  return processed.content;
}

module.exports = function getPreprocessor(options = defaults) {
  options = {
    ...defaults,
    ...options
  };

  init(options);

  return {
    markup: async ({ content }) => ({
      code: await replaceImages(content, options)
    })
  };
};
