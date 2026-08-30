type ScriptProps = React.DetailedHTMLProps<
  React.ScriptHTMLAttributes<HTMLScriptElement>,
  HTMLScriptElement
>;

const Script = ({ children, ...props }: ScriptProps) => {
  return <script {...props}>{children}</script>;
};

export default Script;
