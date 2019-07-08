<script>
  import Waypoint from "svelte-waypoint";

  export let c = "";

  export let alt = "";
  export let width = "";
  export let height = "";
  export let src = "";
  export let srcset = "";
  export let fit = "cover";
  export let sizes = "(max-width: 1000px) 100vw, 1000px";

  let loaded = false;

  $: blur = loaded ? 0 : 10;
  $: opacity = loaded ? 1 : 0;
  $: opacityPlaceholder = loaded ? 0 : 1;

  function load() {
    const img = new Image();
    img.src = src;

    img.onload = () => {
      loaded = true;
    };
  }
</script>

<style>
img {
  object-position: center;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  opacity: 0;
  transition: opacity 0.2s ease, filter 0.4s ease;
}
</style>

<Waypoint once on:enter={load} />
<div style="position: relative; width: 100%;">
  <div style="position: relative; overflow: hidden">
    <div style="width:100%;padding-bottom:66.60000000000001%;" />
    <img
      {src}
      {alt}
      style="opacity: {opacityPlaceholder}; filter: blur(10px);"
    >
    <img
      class={c}
      {alt}
      {width}
      {height}
      {fit}
      {sizes}
      srcset={loaded ? srcset : ''}
      style="filter: blur({blur}px); opacity: {opacity}; object-fit: {fit}"
    >
  </div>
</div>