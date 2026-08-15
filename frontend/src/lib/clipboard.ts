/**
 * Copy text, falling back to a hidden textarea.
 *
 * `navigator.clipboard` only exists in a secure context, so it is missing when
 * the app is opened over plain HTTP on the LAN — which is exactly how a
 * supervisor would reach it from another machine on the call floor.
 */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }

  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    // Off-screen rather than hidden: `display: none` isn't selectable.
    field.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}
