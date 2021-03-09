# Svelte Image

[Demo](https://svelte-image.matyunya.now.sh/)

Svelte image is a preprocessor which automates image optimization using [sharp](https://github.com/lovell/sharp).

It parses your `img` tags, optimizes or inlines them and replaces src accordingly. (External images are not optimized.)

`Image` component enables lazyloading and serving multiple sizes via `srcset`.

This package is heavily inspired by [gatsby image](https://www.gatsbyjs.org/packages/gatsby-image/).

Kudos to [@jkdoshi](https://github.com/jkdoshi) for great [video tutorial](https://www.youtube.com/watch?v=FKNc9A8u2oE) to Svelte Image.

## Installation

```bash
yarn add svelte-image -D
```

`svelte-image` needs to be added as `dev` dependency as Svelte [requires original component source](https://github.com/sveltejs/sapper-template#using-external-components)

In your `rollup.config.js` add `image` to preprocess section:

```js
import image from "svelte-image";


svelte({
  preprocess: {
    ...image(),
  }
})
```

And have fun!

```html
<script>
  import Image from "svelte-image";
</script>

<Image src="fuji.jpg" />
```

Will generate

```html
<img
  src="data:image/png;base64,/9j/2wBDAAYEBQYFBAYG...BwYIChAKCgkJChQODwwQF"
  alt="fuji">
<img
  alt="fuji"
  sizes="(max-width: 1000px) 100vw, 1000px"
  srcset="g/400-fuji.jpg 375w, g/800-fuji.jpg 768w, g/1200-fuji.jpg 1024w"
>
```

## Image path

Please note that the library works only with paths from root in Sapper at the moment.
`<Image src="images/fuji.jpg" />` works the same as `<Image src="/images/fuji.jpg" />`.

In reality, based on how Sapper moves the `static` folder into the root of your project,
technically all image paths should probably start with a `/` to best represent actual paths.

### Svelte + Rollup

To use without Sapper, the generated `static/g` folder needs to be copied to the `public` folder. Use [rollup-plugin-copy](https://www.npmjs.com/package/rollup-plugin-copy) in `rollup.config.js`:

```js
import svelte from 'rollup-plugin-svelte'
import image from 'svelte-image'
import copy from 'rollup-plugin-copy'

export default {
  ...
  plugins: [
    ...
    svelte({
      ...
      preprocess: {
        ...image({...})
      }
    }),
    copy({
      targets: [{ src: 'static/g', dest: 'public' }],
    }),
  ]
}
```

## Configuration and defaults

Image accepts following configuration object:

```js
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

  // should be ./static for Sapper and ./public for plain Svelte projects
  publicDir: "./static/",

  placeholder: "trace", // or "blur",

  // WebP options [sharp docs](https://sharp.pixelplumbing.com/en/stable/api-output/#webp)
  webpOptions: {
    quality: 75,
    lossless: false,
    force: true
  },

  webp: true,

  // Potrace options for SVG placeholder
  trace: {
    background: "#fff",
    color: "#002fa7",
    threshold: 120
  },

  // Whether to download and optimize remote images loaded from a url
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
  // `./static/folder-a/` and `./static/folder-b`.
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
```

## Image component props

Standard image tag props.

- `class` *default: ""*
- `alt` *default: ""*
- `width` *default: ""*
- `height` *default: ""*

- `c` *default: ""* Class string // deprecated in favor of `class`
- `wrapperClass` *default: ""* Classes passed to Waypoint wrapper
- `placeholderClass` *default: ""* Classes passed to placeholder
- `threshold` *default: 1.0* "A threshold of 1.0 means that when 100% of the target is visible within the element specified by the root option, the callback is invoked."
- `lazy` *default: true* Disables Waypoint.

Following props are filled by preprocessor:

- `src` *default: ""*
- `srcset` *default: ""*
- `srcsetWebp` *default: ""*
- `ratio` *default: "100%"*
- `blur` *default: false*
- `sizes` *default: "(max-width: 1000px) 100vw, 1000px"*

## Features

- [x] Generate and add responsive images
- [x] Set base64 placeholder
- [x] Optimize normal images using `img` tag
- [x] Image lazy loading
- [x] Optional SVG trace placeholder
- [x] Support WebP
- [ ] Optimize background or whatever images found in CSS
- [ ] Resolve imported images (only works with string pathnames at the moment)

### Optimizing dynamically referenced images

Svelte Image is great at processing all the images that you reference with
string literals in your templates. When Sapper pre-processes your files, things
like `<img src="/images/me.jpg">` and `<Image src="/images/you.jpg"/>` tell the
pre-processor to create optimized versions of the files and rewrite the paths to
point to the optimized version.

However, we have no way of knowing the value of any dynamic paths at build time.

```
<img src={path}>

```

The code above is completely useless to our image processor, and so we ignore
it.

However, there may be times when you are well aware that you will be, for
example, looping over a set of images that will be rendered in `<img>` tags and
you would like the sources to be optimized. We can work around the limitation
above by telling the pre-processor to optimize images in specific folders via
the `processFolders` array in the config options.

For example, if your config looks something like this

```js
import image from "svelte-image";


svelte({
  preprocess: {
    ...image({
      sizes: [200, 400],
      processFolders: ['people/images']
    }),
  }
})
```

Then, assuming you have the `people/images` folder populated inside your
`static` folder, you can dynamically build strings that target optimized images
like this:

```svelte
<script>
  const images = ["lisa", "bart"]
    .map(person => `/g/people/images/${person}-200.jpg`)
</script>

{#each images as personImage}
  <img src={personImage}>
{/each}
```

We will ignore your `<img>` at build time, but because we processed the entire
`people/images` folder anyway, the images will be available to call at run time.

## Development

Run `yarn && yarn dev` in the `/dev` directory. This is the source code of [demo](https://svelte-image.matyunya.now.sh/) homepage.

## Testing

You can test the preprocessor via `yarn test`. We are using Jest for that, so you can also pass a `--watch` flag to test while developing.

Currently, the best way to test the Svelte component is by using it in a separate project and using yarn/npm link. The dev directory tends to have issues keeping in sync with changes to the src in the root of the repo.
