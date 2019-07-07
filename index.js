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
  const [src] = getSrc(node);

  if (src.type === "MustacheTag") {
    // TODO:
    // infer import
    // throw if dynamic
    return "";
  }
  return "./static/" + src.data;
}

async function replaceImages(content, options) {
  let ast;
  let imageNode;

  try {
    ast = svelte.parse(content);
  } catch {}

  svelte.walk(ast, {
    enter: node => {
      if (node.name !== options.tagName) {
        return;
      }

      imageNode = node;
    }
  });

  if (!imageNode) return content;

  const path = getPath(imageNode);
  const [{ raw }] = getSrc(imageNode);

  // const srcset = Object.keys(options.sizes).map( s =>
  //   sharp(options.sizes[s])
  //     .resize(options.desktopSize)
  //     .toFile(options.outputDir + "/" + s + "-" + path)
  // );

  const base64 = await getBase64(path);

  return content.replace(raw, base64);
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
