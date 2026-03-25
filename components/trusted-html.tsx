type TrustedHtmlProps = {
  html: string;
  className?: string;
};

function sanitizeTrustedHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(?:iframe|object|embed|form|input|button|textarea|select|meta|link)[^>]*>/gi, "")
    .replace(/\son[a-z-]+\s*=\s*(['"])[\s\S]*?\1/gi, "")
    .replace(/\son[a-z-]+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(?:href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, "");
}

export function TrustedHtml({ html, className }: TrustedHtmlProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizeTrustedHtml(html) }}
    />
  );
}
