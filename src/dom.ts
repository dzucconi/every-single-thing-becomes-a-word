/** Resolve required markup once, before registering browser effects. */
export function requireElement<Tag extends keyof HTMLElementTagNameMap>(
  selector: string,
  tag: Tag,
): HTMLElementTagNameMap[Tag] {
  const element = document.querySelector(selector);
  if (!element || element.tagName.toLowerCase() !== tag) {
    throw new Error(`Expected <${tag}> at ${selector}`);
  }
  return element as HTMLElementTagNameMap[Tag];
}
