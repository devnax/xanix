class XanixRedirect extends Error {
  constructor(
    public status: number,
    public location: string,
  ) {
    super("XANIX_REDIRECT");
  }
}

export default XanixRedirect;
