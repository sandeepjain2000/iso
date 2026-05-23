/** JSON response for unexpected handler failures; logs full error server-side. */
export function serverError(err: unknown): Response {
  console.error("[api]", err);
  return Response.json(
    {
      error:
        "Something went wrong processing this request. Check server logs for details.",
    },
    { status: 500 },
  );
}
