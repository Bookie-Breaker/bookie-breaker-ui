import type { Handle, HandleServerError } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "same-origin")
  return response
}

export const handleError: HandleServerError = ({ error, status, message }) => {
  console.error("unhandled server error", status, error)
  // Never leak internal hostnames or stack traces to the browser.
  return { message: status === 404 ? "Not found" : message }
}
