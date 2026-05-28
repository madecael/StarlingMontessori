// Stub for astro:content — used by Vitest only.
export async function getEntry(_collection: string, _slug: string) {
  return {
    data: {
      resendFromAddress: "tours@starlingmontessorischool.com",
      email: "hello@starlingmontessorischool.com",
      siteName: "Starling Montessori",
    },
  };
}

export function defineCollection(_config: unknown) {
  return _config;
}

export function reference(_collection: string) {
  return _collection;
}
