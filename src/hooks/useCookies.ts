import useHeaders from "./useHeaders.js";

const useCookies = () => {
  const headers = useHeaders();
  let cookies = __XANIX_SERVER__ ? headers?.cookie : document.cookie;
  return cookies?.split(";").reduce(
    (cookies, cookie) => {
      const [name, value] = cookie.split("=");
      cookies[name.trim()] = value;
      return cookies;
    },
    {} as Record<string, string>,
  );
};

export default useCookies;
