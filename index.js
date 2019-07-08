const svelte = require("svelte/compiler");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const defaults = {
  tagName: "Image",
  sizes: [400, 800, 1200],
  outputDir: "./static"
};

async function getBase64(pathname) {
  const s = await sharp(pathname)
    .resize(128)
    .toBuffer();

  return "data:image/png;base64," + s.toString("base64");
}

function getProp(node, attr) {
  return node.attributes.find(a => a.name === attr).value;
}

function getPathname(node) {
  const [value] = getProp(node, "src");

  if (value.type === "MustacheTag") {
    // TODO:
    // infer import
    // throw if dynamic

    return "";
  }
  return path.resolve("./static/", value.data);
}

function getFilename(p, size) {
  return `${size}-${path.basename(p, path.extname(p))}${path.extname(p)}`;
}

function add(content, value, start, end, offset) {
  return {
    content:
      content.substr(0, start + offset) + value + content.substr(end + offset),
    offset: offset + value.length - (end - start)
  };
}

function resize(options, pathname) {
  return async size => {
    const filename = getFilename(pathname, size);

    const outPath = path.resolve(options.outputDir, filename);

    if (fs.existsSync(outPath)) {
      return {
        ...(await sharp(pathname).metadata()),
        filename,
        size
      };
    }

    return {
      ...(await sharp(pathname)
        .resize(size)
        .toFile(outPath)),
      size,
      filename
    };
  };
}

function getSrcset(sizes) {
  const srcSetValue = sizes.map(s => `${s.filename} ${s.size}w`).join(",\n");
  const sizesValue = sizes
    .map((s, i) =>
      i === sizes.length + 1
        ? `${s.size}px`
        : `(max-width: ${s.size}px) ${s.size}px`
    )
    .join(",\n");

  return `srcset=\'${srcSetValue}\' sizes=\'${sizesValue}\'`;
}

async function replace(edited, node, options) {
  const { content, offset } = await edited;
  const pathname = getPathname(node);

  const base64 = await getBase64(pathname);
  const [{ start, end }] = getProp(node, "src");

  const withBase64 = add(content, base64, start, end, offset);

  const sizes = await Promise.all(options.sizes.map(resize(options, pathname)));

  return add(
    withBase64.content,
    getSrcset(sizes),
    end + 1,
    end + 2,
    withBase64.offset
  );
}

async function replaceImages(content, options) {
  let ast;
  const imageNodes = [];

  try {
    ast = svelte.parse(content);
  } catch {}

  svelte.walk(ast, {
    enter: node => {
      if (node.name !== options.tagName) return;

      imageNodes.push(node);
    }
  });

  if (!imageNodes.length) return content;

  const beforeProcessed = {
    content,
    offset: 0
  };

  const processed = await imageNodes.reduce(
    async (edited, node) => replace(edited, node, options),
    beforeProcessed
  );

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
