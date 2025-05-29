export function createTitle(text: string): HTMLHeadingElement {
  const title = document.createElement("h1");
  title.textContent = text;
  return title;
}
