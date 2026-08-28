import { Component, useEffect, useState } from "react";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(() => resolve({ name: "nax" }), ms));

const asynchoronize = async (
  fn: (props: any) => Promise<() => React.JSX.Element>,
) => {
  const Component = await fn({});
  return async (props: any) => {
    return <Component {...props} />;
  };
};

const Async = async (props: any) => {
  const data = await sleep(1000);
  return function AsyncComponent() {
    const [state, setstate] = useState();
    useEffect(() => {
      console.log(data);
    }, []);
    return <div>Async Component</div>;
  };
};

export default asynchoronize(Async as any);

// const Comp = async (props: any) => {
//   const data = await User.find();
//   return (
//     <div>
//       Async Component
//       <div>{data.name}</div>
//     </div>
//   );
// };

// // transform to
// const Comp = (props: any) => {
//   const [loading, data] = xanixAsync(async () => await User.find());
//   if (loading) {
//     return <div>Loading...</div>;
//   }
//   return (
//     <div>
//       Async Component
//       <div>{data.name}</div>
//     </div>
//   );
// };
