<script setup lang="ts">
import { inject } from "vue";
import type { Request } from "express";

const req = inject<Request>("req");
</script>

<template>
  <div class="layout">
    <header>
      <nav>
        <a href="/">Home</a>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer>
      <small>
        &copy; {{ new Date().getFullYear() }} Xanix
      </small>
    </footer>
  </div>
</template>