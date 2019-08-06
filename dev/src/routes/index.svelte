<script>
  import Image from "svelte-image";
  import Waypoint from "svelte-waypoint";
  import Code from "../Code.svelte";
</script>

<main class="max-w-6xl mx-auto">
  <h1 class="flex items-center">
    Svelte image
    <a href="https://github.com/matyunya/svelte-image" class="pl-8">
      <img src="/github.png" alt="Github Smelte" width="64" height="64" />
    </a>
  </h1>

  <p>Is a preprocessor which transforms a normal image</p>

  <Code class="my-4" code={`<Image alt="fuji" src="fuji.jpg" />`} />

  <p>
    into resized, optimized, lazy loaded, WebP with old browsers fallback image with
    <a
      class="a"
      href="https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images">
      srcset
    </a>
    and a beautiful trace or blur base64 placeholder like this
  </p>

    <Code class="my-4" code={`<img
  src="data:image/png;base64,/9j/2wBDAAYEBQYFBAYG...BwYIChAKCgkJChQODwwQF"
  alt="fuji">
<picture>
  <source type="image/webp" srcset="g/400-fuji.webp 375w, g/800-fuji.webp 768w, g/1200-fuji.webp 1024w">
  <source srcset="g/400-fuji.jpg 375w, g/800-fuji.jpg 768w, g/1200-fuji.jpg 1024w">
  <img alt="fuji">
</picture>`} />

  <h2>Very nice!</h2>

  <p class="mb-8">
    If you use the normal img tag, your image will be optimized and if its size
    is below certain threshold if will be inlined as base64 (like Github logo
    here).
  </p>
  <Image alt="fuji" src="fuji.jpg" />
  <Image alt="doggo" src="animals.jpg" />
  <Image alt="painting 1" src="1.jpg" />
  <Image alt="painting 2" src="2.jpg" />
  <Image alt="painting 3" src="3.jpg" />
  <Image alt="painting 4" src="4.png" />
  <Image alt="painting 5" src="5.jpg" />
  <Image alt="painting 6" src="6.jpg" />
  <Image alt="painting 7" src="7.jpg" />
  <Image alt="painting 8" src="8.jpg" />
</main>
