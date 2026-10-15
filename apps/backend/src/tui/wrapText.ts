/** Break long lines so Ink thinking panel stays inside terminal width. */
export function wrapForTerminal(text: string, width: number): string {
  const max = Math.max(1, width);
  const out: string[] = [];

  for (const paragraph of text.split("\n")) {
    if (paragraph.length <= max) {
      out.push(paragraph);
      continue;
    }
    let rest = paragraph;
    while (rest.length > max) {
      let breakAt = rest.lastIndexOf(" ", max);
      if (breakAt <= 0) breakAt = max;
      out.push(rest.slice(0, breakAt).trimEnd());
      rest = rest.slice(breakAt).trimStart();
    }
    if (rest.length) out.push(rest);
  }

  return out.join("\n");
}
