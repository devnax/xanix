<script lang="ts">
  import { getContext } from "svelte";

  let {
    Child,
    childProps = {},
  }: { Child: any; childProps?: Record<string, any> } = $props();

  const req = getContext<{ path?: string }>("req");
</script>

<div class="layout">
  <header>
    <nav>
      <a href="/">Home</a>
    </nav>
  </header>

  <main>
    <Child {...childProps} />
  </main>

  <footer>
    <small>&copy; {new Date().getFullYear()} Xanix · {req?.path}</small>
  </footer>
</div>
