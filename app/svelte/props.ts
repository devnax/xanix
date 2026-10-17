export const metadata = {
  title: "Svelte Page",
  description: "This is the Svelte page for the Xanix app.",
};

export const props = () => {
  return {
    title: "Hello",
    message: "Welcome to Xanix.",
    user: { name: "Naxrul" },
    items: ["Item 1", "Item 2", "Item 3"],
  };
};
