import Swal from "sweetalert2";

/** Respect the user's reduced-motion preference for all SweetAlert animations. */
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isSmallScreen = () => window.matchMedia("(max-width: 640px)").matches;

/** min-h-11 keeps the dialog buttons at a 44px touch target on phones. */
const BUTTON_BASE =
  "inline-flex items-center justify-center min-h-11 rounded-lg px-5 py-2.5 text-sm font-bold transition-colors duration-150 cursor-pointer";

/** Modal confirmations — destructive and neutral variants share one base config. */
const confirmDialog = Swal.mixin({
  buttonsStyling: false,
  reverseButtons: true,
  focusCancel: true,
  animation: !prefersReducedMotion(),
  // Never wider than the viewport, gutters included.
  width: "min(32rem, calc(100vw - 2rem))",
  customClass: {
    popup: "rounded-xl font-sans",
    title: "text-lg font-bold text-[#1e3a5f]",
    htmlContainer: "text-sm text-slate-600",
    confirmButton: `${BUTTON_BASE} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`,
    cancelButton: `${BUTTON_BASE} border border-[#e4e7eb] bg-white text-slate-600 hover:bg-[#f1f3f5] mr-2`,
    actions: "gap-2",
  },
});

/** Non-blocking toasts anchored top-right. */
const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2800,
  timerProgressBar: true,
  animation: !prefersReducedMotion(),
  customClass: {
    popup: "rounded-lg font-sans text-sm",
    title: "text-sm font-semibold",
  },
  didOpen: (el) => {
    el.addEventListener("mouseenter", Swal.stopTimer);
    el.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

/**
 * Corner-anchored on desktop; centred at the top on phones, where a right-hand
 * toast would sit on top of the Publish button.
 */
const toastPosition = () => (isSmallScreen() ? ("top" as const) : ("top-end" as const));

export const notify = {
  success: (title: string) =>
    void toast.fire({ icon: "success", title, position: toastPosition() }),
  error: (title: string) =>
    void toast.fire({ icon: "error", title, timer: 4500, position: toastPosition() }),
  info: (title: string) => void toast.fire({ icon: "info", title, position: toastPosition() }),
};

export async function confirmDelete(title: string, text: string): Promise<boolean> {
  const result = await confirmDialog.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    customClass: {
      popup: "rounded-xl font-sans",
      title: "text-lg font-bold text-[#1e3a5f]",
      htmlContainer: "text-sm text-slate-600",
      actions: "gap-2",
      confirmButton: `${BUTTON_BASE} bg-[#dc2626] text-white hover:bg-[#b91c1c]`,
      cancelButton: `${BUTTON_BASE} border border-[#e4e7eb] bg-white text-slate-600 hover:bg-[#f1f3f5] mr-2`,
    },
  });
  return result.isConfirmed;
}

/** Single-line text prompt. Resolves to null when cancelled or left blank. */
export async function promptText(
  title: string,
  { text, placeholder, value = "", confirmButtonText = "Create" }: {
    text?: string;
    placeholder?: string;
    value?: string;
    confirmButtonText?: string;
  } = {},
): Promise<string | null> {
  const result = await confirmDialog.fire({
    title,
    text,
    input: "text",
    inputValue: value,
    inputPlaceholder: placeholder,
    inputAttributes: { maxlength: "200", autocapitalize: "sentences" },
    inputValidator: (entered) => (entered.trim() ? undefined : "Enter a name"),
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancel",
    focusCancel: false,
    customClass: {
      popup: "rounded-xl font-sans",
      title: "text-lg font-bold text-[#1e3a5f]",
      htmlContainer: "text-sm text-slate-600",
      input: "rounded-lg border border-[#e4e7eb] text-sm",
      actions: "gap-2",
      confirmButton: `${BUTTON_BASE} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`,
      cancelButton: `${BUTTON_BASE} border border-[#e4e7eb] bg-white text-slate-600 hover:bg-[#f1f3f5] mr-2`,
    },
  });
  const entered = typeof result.value === "string" ? result.value.trim() : "";
  return result.isConfirmed && entered ? entered : null;
}

export async function confirmAction(
  title: string,
  text: string,
  confirmButtonText = "Confirm",
): Promise<boolean> {
  const result = await confirmDialog.fire({
    icon: "question",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancel",
  });
  return result.isConfirmed;
}
