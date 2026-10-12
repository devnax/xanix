function stripComments(code: string): string {
  return code.replace(
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\/[^\r\n]*|\/\*[\s\S]*?\*\/)/g,
    (match, stringLiteral) => {
      if (stringLiteral) return match;
      return match.replace(/[^\r\n]/g, " ");
    },
  );
}

export default stripComments;
