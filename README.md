# Svelte image
[Demo](https://svelte-image.matyunya.now.sh/)

Svelte image is a preprocessor which automates image optimization using [sharp](https://github.com/lovell/sharp).

It parses your `img` tags, optimizes or inlines them and replaces src accordingly. (External images are not optimized.)

`Image` component enables lazyloading and serving multiple sizes via `srcset`.

This package is heavily inspired by [gatsby image](https://www.gatsbyjs.org/packages/gatsby-image/).

### Installation
```
yarn add svelte-image
```

In your `rollup.config.js` add `image` to preprocess section:

```
import image from "svelte-image";


svelte({
  preprocess: {
    ...image(),
  }
})
```

And have fun!
```
<script>
  import Image from "svelte-image";
</script>

<Image src="fuji.jpg">
```
Will generate
```
<img
  src="data:image/png;base64,/9j/2wBDAAYEBQYFBAYG...BwYIChAKCgkJChQODwwQF"
  alt="fuji">
<img
  alt="fuji"
  sizes="(max-width: 1000px) 100vw, 1000px"
  srcset="g/400-fuji.jpg 375w, g/800-fuji.jpg 768w, g/1200-fuji.jpg 1024w"
>
```

### Image path

Please note that the library works only with relative paths in Sapper at the moment.
`<Image src="images/fuji.jpg">` works whereas `<Image src="/images/fuji.jpg">` doesn't.

### Configuration and defaults

Image accepts following configuration object:

```
const defaults = {
  optimizeAll: true, // optimize all images discovered in img tags
  inlineBelow: 10000, // inline all images in img tags below 10kb
  compressionLevel: 8, // png quality level
  quality: 70, // jpeg/webp quality level
  tagName: "Image", // default component name
  sizes: [400, 800, 1200], // array of sizes for srcset in pixels
  breakpoints: [375, 768, 1024], // array of screen size breakpoints at which sizes above will be applied
  outputDir: "g/",
  placeholder: "trace", // or "blur",
  webpOptions: { // WebP options [sharp docs](https://sharp.pixelplumbing.com/en/stable/api-output/#webp)
    quality: 75,
    lossless: false,
    force: true
  },
  webp: true,
  trace: { // Potrace options for SVG placeholder
    background: "#fff",
    color: "#002fa7",
    threshold: 120
  }
};
```

### Features
- [x] Generate and add responsive images
- [x] Set base64 placeholder
- [x] Optimize normal images using `img` tag
- [x] Image lazy loading
- [x] Optional SVG trace placeholder
- [x] Support WebP
- [ ] Optimize background or whatever images found in CSS
- [ ] Resolve imported images (only works with string pathnames at the moment)

### Development

Run `yarn && yarn dev` in the `/dev` directory. This is the source code of [demo](https://svelte-image.matyunya.now.sh/) homepage.