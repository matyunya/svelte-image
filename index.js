const svelte = require("svelte/compiler");
const sharp = require("sharp");

const defaults = {
  tagName: "Image",
  sizes: {
    sm: 600,
    lg: 1200
  },
  outputDir: "./static"
};

async function getBase64(path) {
  const s = await sharp(path)
    .resize(32)
    .toBuffer();

  return "data:image/png;base64," + s.toString("base64");
}

function getSrc(node) {
  return node.attributes.find(a => a.name === "src").value;
}

function getPath(node) {
  const [value] = getSrc(node);

  if (value.type === "MustacheTag") {
    // TODO:
    // infer import
    // throw if dynamic
    return "";
  }
  return "./static/" + value.data;
}

async function replace(edited, node) {
  const { content, offset } = await edited;
  const path = getPath(node);
  const [{ start, end }] = getSrc(node);

  // const srcset = Object.keys(options.sizes).map( s =>
  //   sharp(options.sizes[s])
  //     .resize(options.desktopSize)
  //     .toFile(options.outputDir + "/" + s + "-" + path)
  // );

  const base64 = await getBase64(path);

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
    async (edited, node) => replace(edited, node),
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
