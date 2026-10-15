<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    items?: string[];
  }>(),
  {
    title: "Hello",
    message: "Welcome to Xanix.",
    items: () => [],
  },
);
  const showAlert = () => {
    alert("Hello from Vue!");
  };
</script>

<template>
  <section>
    <h1>{{ title }}</h1>
    <p>{{ message }}</p>
    <button @click="showAlert">Click Me</button>

    <ul v-if="items.length">
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
  </section>
</template>