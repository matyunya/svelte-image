const svelte = require("svelte/compiler");
const sharp = require("sharp");
const util = require("util");

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

function updateSrc(node, value) {
  const [src] = getSrc(node);

  src.raw = value;
  src.data = value;
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

function replaceImages(content, options) {
  let ast;

  try {
    ast = svelte.parse(content);
  } catch {}

  svelte.walk(ast, {
    enter: async node => {
      if (node.name !== options.tagName) {
        return;
      }

      const path = getPath(node);
      const [{ raw }] = getSrc(node);

      // const srcset = Object.keys(options.sizes).map( s =>
      //   sharp(options.sizes[s])
      //     .resize(options.desktopSize)
      //     .toFile(options.outputDir + "/" + s + "-" + path)
      // );

      const base64 = await getBase64(path);

      content = content.replace(raw, base64);

      console.log(content);
    }
  });

  if (content.includes("Great")) {
    console.log(content, "TTTT");
  }

  return content;
}

module.exports = function getPreprocessor(options = defaults) {
  options = {
    ...defaults,
    ...options
  };

  return {
    markup: function image({ content }) {
      return { code: replaceImages(content, options) };
    }
  };
};
