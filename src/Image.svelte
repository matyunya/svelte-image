<script>
  import Waypoint from "svelte-waypoint";

  export let c = "";

  export let alt = "";
  export let width = "";
  export let height = "";
  export let src = "";
  export let srcset = "";
  export let srcsetWebp = "";
  export let blur = false;
  export let sizes = "(max-width: 1000px) 100vw, 1000px";

  let loaded = false;

  let img = {};

  function load(img) {
    img.onload = () => loaded = true;
  }
</script>

<style>
  img {
    object-position: center;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    will-change: opacity;
  }

  .blur {
    filter: blur(10px);
    transition: opacity 0.4s ease, filter 0.5s ease;
  }

  .placeholder {
    opacity: 1;
    transition: opacity 0.5s ease;
    transition-delay: 0.7s;
  }
   .main {
    opacity: 0;
    transition: opacity 0.5s ease;
    transition-delay: 0.7s;
  }

  .loaded .placeholder {
    opacity: 0;
  }
  .loaded .main {
    opacity: 1;
  }
</style>

<Waypoint
  c="w-full"
  style="min-height: 100px"
  once
  threshold={1.0}>
  <div class:loaded style="position: relative; width: 100%;">
    <div style="position: relative; overflow: hidden">
      <div style="width:100%;padding-bottom:66.60000000000001%;" />
      <img
        class="placeholder"
        {src}
        {alt}
      >
      <picture>
        <source type="image/webp" srcset={srcsetWebp}>
        <source srcset={srcset}>
        <img
          use:load
          class="main {c}"
          class:blur
          {alt}
          {width}
          {height}
          {sizes}
        >
    </picture>
    </div>
  </div>
</Waypoint>