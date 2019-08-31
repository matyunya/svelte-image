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

function getPathsObject(nodeSrc, options) {
  const inPath = path.resolve("./static/", nodeSrc);
  const outDir = path.dirname(
    path.resolve("./static/", options.outputDir, nodeSrc)
  );
  const filename = path.basename(inPath);
  const outUrl = path.relative("./static", path.join(outDir, filename));

  return {
    inPath,
    outDir,
    outPath: path.join(outDir, filename),
    outUrl,
    getResizePaths: size => {
      const filenameWithSize = getFilenameWithSize(inPath, size);
      return {
        outPath: path.join(outDir, filenameWithSize),
        outUrl: path.join(path.dirname(outUrl), filenameWithSize),
        outPathWebp: path.join(outDir, getWebpFilenameWithSize(inPath, size))
      };
    }
  };
}

async function getBase64(pathname, inlined = false) {
  let size = 64;

  if (inlined) {
    size = (await sharp(pathname).metadata()).size;
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
  const prop = node.attributes.find(a => a.name === attr);
  return prop ? prop.value : undefined;
}

function getSrc(node) {
  return getProp(node, "src") || [{}];
}

// Checks beginning of string for double leading slash, or the same preceeded by
// http or https
const IS_EXTERNAL = /^(https?:)?\/\//;

function willNotProcess(reason) {
  return {
    willNotProcess: true,
    reason,
    paths: undefined
  };
}

function willProcess(nodeSrc, options) {
  return {
    willNotProcess: false,
    reason: undefined,
    paths: getPathsObject(nodeSrc, options)
  };
}

function getProcessingPathsForNode(node, options) {
  const [value] = getSrc(node);

  // dynamic or empty value
  if (value.type === "MustacheTag" || value.type === "AttributeShorthand") {
    return willNotProcess(`Cannot process a dynamic value: ${value.type}`);
  }
  if (!value.data) {
    return willNotProcess("The `src` is blank");
  }
  if (IS_EXTERNAL.test(value.data)) {
    return willNotProcess(`The \`src\` is external: ${value.data}`);
  }

  // TODO:
  // resolve imported path

  // Removes a leading slash, as long as it is not followed by another slash
  const removedDomainSlash = value.data.replace(/^\/([^\/])/, "$1");

  const fullPath = path.resolve("./static/", removedDomainSlash);

  if (fs.existsSync(fullPath)) {
    return willProcess(removedDomainSlash, options);
  } else {
    return willNotProcess(`The image file does not exist: ${fullPath}`);
  }
}

function getBasename(p) {
  return path.basename(p, path.extname(p));
}

function getRelativePath(p) {
  return path.relative("./static/", p);
}

function getFilenameWithSize(p, size) {
  return `${getBasename(p)}-${size}${path.extname(p)}`;
}

function getWebpFilenameWithSize(p, size) {
  return `${getBasename(p)}-${size}.webp`;
}

function ensureOutDirExists(outDir) {
  mkdirp(path.join("./static", getRelativePath(outDir)));
}

function insert(content, value, start, end, offset) {
  return {
    content:
      content.substr(0, start + offset) + value + content.substr(end + offset),
    offset: offset + value.length - (end - start)
  };
}

async function createSizes(paths, options) {
  const smallestSize = options.sizes.sort().slice(0, 1);
  const meta = await sharp(paths.inPath).metadata();
  const sizes = smallestSize > meta.width ? [meta.width] : options.sizes;

  return (await Promise.all(
    sizes.map(size => resize(size, paths, options, meta))
  )).filter(x => !!x);
}

async function resize(size, paths, options, meta = null) {
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
      size
    };
  }

  return {
    ...meta,
    ...(await sharp(paths.inPath)
      .resize({ width: size, withoutEnlargement: true })
      .jpeg({
        quality: options.quality,
        progressive: false,
        force: false
      })
      .png({ compressionLevel: options.compressionLevel, force: false })
      .toFile(outPath)),
    size,
    filename: outUrl
  };
}

// Pass a string, then it will call itself with an array
function mkdirp(dir) {
  if (typeof dir === "string") {
    if (fs.existsSync(dir)) {
      return dir;
    }
    return mkdirp(dir.split("/"));
  }

  return dir.reduce((created, nextPart) => {
    const newDir = path.join(created, nextPart);
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir);
    }
    return newDir;
  }, "");
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

  const { paths, willNotProcess, reason } = getProcessingPathsForNode(
    node,
    options
  );
  if (willNotProcess) {
    console.error(reason);
    return { content, offset };
  }

  const sizes = await createSizes(paths, options);

  const base64 =
    options.placeholder === "blur"
      ? await getBase64(paths.inPath)
      : await getTrace(paths.inPath, options);

  const [{ start, end }] = getSrc(node);

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

async function optimize(paths, options) {
  const { size } = fs.statSync(paths.inPath);
  if (options.inlineBelow && size < options.inlineBelow) {
    return getBase64(paths.inPath, true);
  }

  ensureOutDirExists(paths.outDir);

  await sharp(paths.inPath)
    .jpeg({ quality: options.quality, progressive: false, force: false })
    .webp({ quality: options.quality, lossless: true, force: false })
    .png({ compressionLevel: options.compressionLevel, force: false })
    .toFile(paths.outPath);

  return paths.outUrl;
}

async function replaceInImg(edited, node, options) {
  const { content, offset } = await edited;

  const { paths, willNotProcess } = getProcessingPathsForNode(node, options);
  if (willNotProcess) {
    return { content, offset };
  }

  const [{ start, end }] = getSrc(node);

  try {
    await optimize(paths, options);
    return insert(content, paths.outUrl, start, end, offset);
  } catch (e) {
    return { content, offset };
  }
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

  return {
    markup: async ({ content }) => ({
      code: await replaceImages(content, options)
    })
  };
};
