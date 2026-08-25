import { useMemo } from "react";
import { getGlobalXanix } from "../utils";

type MetaTagProps = {
  name: string;
  content: string;
};

const Meta = ({ name, content }: MetaTagProps) => {
  useMemo(() => {
    const xanix = getGlobalXanix();
    xanix.page_metas = xanix.page_metas || [];
    xanix.page_metas.push({ name, content });
  }, [name, content]);

  return <></>;
};

export default Meta;
