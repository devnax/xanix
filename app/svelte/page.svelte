<script lang="ts">
  let {
    title = "Hello",
    message = "Welcome to Xanix.",
    items = [],
  }: { title?: string; message?: string; items?: string[] } = $props();
  function showAlert() {
    alert("Button clicked!");
  }
  import Header from "./Header.svelte";
</script>

<Header />
<section>
  <h1>{title}</h1>
  <p>{message}</p>
  <button onclick={showAlert}>Click Me ssssssss</button>

  {#if items.length}
    <ul>
      {#each items as item (item)}
        <li>{item}</li>
      {/each}
    </ul>
  {/if}
</section>
