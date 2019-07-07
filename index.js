const svelte = require("svelte/compiler");
const sharp = require("sharp");
const path = require("path");

const defaults = {
  tagName: "Image",
  sizes: {
    sm: 400,
    lg: 800
  },
  outputDir: "./static"
};

async function getBase64(pathname) {
  const s = await sharp(pathname)
    .resize(32)
    .toBuffer();

  return "data:image/png;base64," + s.toString("base64");
}

function getSrc(node) {
  return node.attributes.find(a => a.name === "src").value;
}

function getPathname(node) {
  const [value] = getSrc(node);

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

async function replace(edited, node, options) {
  const { content, offset } = await edited;
  const pathname = getPathname(node);
  const [{ start, end }] = getSrc(node);

  // stick images in output folder
  await Promise.all(
    Object.keys(options.sizes).map(async s =>
      sharp(pathname)
        .resize(options.sizes[s])
        .toFile(path.resolve(options.outputDir, getFilename(pathname, s)))
    )
  );

  const base64 = await getBase64(pathname);

  return {
    content:
      content.substr(0, start + offset) + base64 + content.substr(end + offset),
    offset: offset + base64.length - (end - start)
  };
}

async function replaceImages(content, options) {
  let ast;
  const imageNodes = [];

  try {
    ast = svelte.parse(content);
  } catch {}

  svelte.walk(ast, {
    enter: node => {
      if (node.name !== options.tagName) {
        return;
      }

      imageNodes.push(node);
    }
  });

  if (!imageNodes.length) return content;

  const processed = await imageNodes.reduce(
    async (edited, node) => replace(edited, node, options),
    {
      content,
      offset: 0
    }
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
