/** Looks up a required element and fails loudly if the markup drifted from the code. */
export function byId<T extends HTMLElement = HTMLElement>(id: string, root: ParentNode = document): T {
  const el = root.querySelector<T>('#' + id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el;
}

type Child = Node | string | number | null | undefined | false;

/** Tiny hyperscript helper; text children are always inserted as text, never HTML. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<{id: string; className: string; text: string; disabled: boolean; title: string}> & {data?: Record<string, string>} = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const {data, text, ...rest} = props;
  Object.assign(node, rest);
  if (text !== undefined) node.textContent = text;
  if (data) for (const [key, value] of Object.entries(data)) node.dataset[key] = value;
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'number' ? String(child) : child);
  }
  return node;
}
