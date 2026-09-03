export interface XanixClientEntry {
  id: string;
  name: string;
  file: string;
  path: string;
  export: string;
}

export type ClientManifest = {
  id: string;
  entries: Array<XanixClientEntry>;
};
