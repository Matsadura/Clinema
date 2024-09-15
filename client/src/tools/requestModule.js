export const request = async (url, options) => {
  const response = await fetch(`http://127.0.0.1:5000/api${url}`, options);
  const data = await response.json();
  return { status: response.status, data };
};
