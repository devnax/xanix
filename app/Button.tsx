import React, { useLayoutEffect } from "react";

const Button = ({ bgcolor }: any) => {
  useLayoutEffect(() => {
    const style = document.createElement("style");
    style.textContent = `button { background-color: ${bgcolor}; }`;
    document.head.appendChild(style);
  }, [bgcolor]);
  return (
    <>
      <button style={{ backgroundColor: bgcolor }}>Click me</button>
    </>
  );
};

export default Button;
