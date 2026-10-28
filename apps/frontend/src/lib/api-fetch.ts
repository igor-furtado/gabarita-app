export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      typeof body.message === "string"
        ? body.message
        : "Não foi possível conectar ao seu espaço de estudo.",
    );
  return body as T;
}
