export interface XanixClientEntry {
  id: string;
  name: string;
  file: string;
  path: string;
  build: string;
  export: string;
}

export type ClientManifest = {
  id: string;
  entries: Array<XanixClientEntry>;
};
