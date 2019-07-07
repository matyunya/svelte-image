<script>
  import Waypoint from "components/Waypoint.svelte";

  export let alt = "";
  export let width = "";
  export let height = "";
  export let src = "";
  export let srcset = "";
  export let placeholder = "";
  export let c = "";

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

<Waypoint
  {c}
  once
  on:enter={load}
  style="height: {height}px; filter: blur({blur}px); transition: filter;"
>
  {#if loaded}
    <img class={c} {src} {alt} {width} {height} {srcset} />
  {:else if placeholder}
    <img class={c} src={placeholder} {alt} {width} {height} />
</Waypoint>
