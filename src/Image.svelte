<script>
  import Waypoint from "svelte-waypoint";

  export let c = "";

  export let alt = "";
  export let width = "";
  export let height = "";
  export let src = "";
  export let srcset = "";
  export let fit = "cover";
  export let sizes = {
    sm: 400,
    lg: 800
  };

  let loaded = false;

  $: blur = loaded ? 0 : 3;

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
}
</style>

<Waypoint once on:enter={load} />
<img
  class={c}
  {...$$props}
  {alt}
  srcset={srcset}
  style="filter: blur({blur}px); transition: filter 2s; object-fit: {fit}"
>

