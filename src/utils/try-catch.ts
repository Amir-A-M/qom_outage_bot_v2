export async function tryCatch(promise: Promise<any>) {
  try {
    const response = await promise;
    return { response, error: null };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.log(error);
    return { response: null, error: error };
  }
}
