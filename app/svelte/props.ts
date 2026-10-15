export const metadata = {
  title: "HTML Page",
  description: "This is the HTML page for the Xanix app.",
};

export const props = () => {
  return {
    title: "Hello",
    message: "Welcome to Xanix.",
    user: { name: "Naxrul" },
    items: ["Item 1", "Item 2", "Item 3"],
  };
};
