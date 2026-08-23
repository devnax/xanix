export type XanixDocumentProps = {
  metadata?: {
    title?: string;
    description?: string;
  };
  scripts?: Array<{
    src: string;
    type?: string;
    placement?: "head" | "body";
  }>;
  styles?: Array<{
    href: string;
    placement?: "head" | "body";
  }>;
};

export type XanixPageProps = {
  document: XanixDocumentProps;
};
