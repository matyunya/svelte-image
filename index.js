const svelte = require("svelte/compiler");
const sharp = require("sharp");
const path = require("path");
const util = require("util");
const fs = require("fs");

const defaults = {
  optimizeAll: true,
  inlineBelow: 10000,
  compressionLevel: 8,
  quality: 70,
  webpOptions: {
    quality: 75,
    lossless: false,
    force: true
  },
  webp: true,
  tagName: "Image",
  sizes: [400, 800, 1200],
  breakpoints: [375, 768, 1024],
  outputDir: "g/",
  placeholder: "trace", // or "blur"
  trace: {
    background: "#fff",
    color: "#002fa7",
    threshold: 120
  }
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

const optimizeSVG = svg => {
  const svgo = require(`svgo`);
  const res = new svgo({
    multipass: true,
    floatPrecision: 0,
    datauri: "base64"
  });

  return res.optimize(svg).then(({ data }) => data);
};

async function getTrace(pathname, options) {
  const potrace = require("potrace");
  const trace = util.promisify(potrace.trace);

  const s = await sharp(pathname)
    .resize(500)
    .toBuffer();

  const res = await trace(s, options.trace);

  return optimizeSVG(res);
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

function getWebpFilenameWithSize(p, size) {
  return `${getBasename(p)}-${size}.webp`;
}

function insert(content, value, start, end, offset) {
  return {
    content:
      content.substr(0, start + offset) + value + content.substr(end + offset),
    offset: offset + value.length - (end - start)
  };
}

function getOutPath(options, filename) {
  const dir = "./static/" + options.outputDir;
  return (outPath = path.resolve(dir, filename));
}

function resize(options, pathname) {
  return async size => {
    const filename = getFilenameWithSize(pathname, size);
    const outPath = getOutPath(options, filename);
    const meta = await sharp(pathname).metadata();
    const filenameWebp = getWebpFilenameWithSize(pathname, size);
    const outPathWebp = getOutPath(options, filenameWebp);

    if (meta.width < size) return null;

    if (options.webp && !fs.existsSync(outPathWebp)) {
      await sharp(pathname)
        .resize({ width: size, withoutEnlargement: true })
        .webp(options.webpOptions)
        .toFile(outPathWebp);
    }

    if (fs.existsSync(outPath)) {
      return {
        ...meta,
        filename: options.outputDir + filename,
        size
      };
    }

    return {
      ...meta,
      ...(await sharp(pathname)
        .resize({ width: size, withoutEnlargement: true })
        .jpeg({ quality: options.quality, progressive: false, force: false })
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

const srcsetLine = options => (s, i) =>
  `${s.filename} ${options.breakpoints[i]}w`;

const srcLine = () => s => s.filename;

const srcsetLineWebp = options => (s, i) =>
  `${s.filename} ${options.breakpoints[i]}w`
    .replace("jpg", "webp")
    .replace("png", "webp")
    .replace("jpeg", "webp");

function getSrcset(sizes, options, lineFn = srcsetLine, tag = "srcset") {
  const s = Array.isArray(sizes) ? sizes : [sizes];
  const srcSetValue = s
    .filter(f => f)
    .map(lineFn(options))
    .join(",\n");

  return ` ${tag}=\'${srcSetValue}\' `;
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

  const base64 =
    options.placeholder === "blur"
      ? await getBase64(pathname)
      : await getTrace(pathname, options);

  const [{ start, end }] = getProp(node, "src");

  const withBase64 = insert(content, base64, start, end, offset);

  const withSrcset = insert(
    withBase64.content,
    getSrcset(sizes, options),
    end + 1,
    end + 2,
    withBase64.offset
  );

  const withRatio = insert(
    withSrcset.content,
    ` ratio=\'${(1 / (sizes[0].width / sizes[0].height)) * 100}%\' `,
    end + 1,
    end + 2,
    withSrcset.offset
  );

  if (!options.webp) return withRatio;

  return insert(
    withRatio.content,
    getSrcset(sizes, options, srcsetLineWebp, "srcsetWebp"),
    end + 1,
    end + 2,
    withRatio.offset
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
    .jpeg({ quality: options.quality, progressive: false, force: false })
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
