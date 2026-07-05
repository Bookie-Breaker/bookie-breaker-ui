/** Minimal toast queue rendered by the layout's Toasts component. */

export interface Toast {
  id: number
  message: string
  href?: string
  tone: "info" | "success" | "error"
}

const DISMISS_MS = 6_000

class Toasts {
  items = $state<Toast[]>([])
  #next = 1

  add(message: string, options: { href?: string; tone?: Toast["tone"] } = {}): void {
    const toast: Toast = {
      id: this.#next++,
      message,
      href: options.href,
      tone: options.tone ?? "info"
    }
    this.items = [...this.items, toast]
    setTimeout(() => this.dismiss(toast.id), DISMISS_MS)
  }

  dismiss(id: number): void {
    this.items = this.items.filter((toast) => toast.id !== id)
  }
}

export const toasts = new Toasts()
