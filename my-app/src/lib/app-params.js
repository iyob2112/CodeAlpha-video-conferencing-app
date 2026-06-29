const isBrowser = typeof window !== "undefined";

const storage = isBrowser ? window.localStorage : null;

const toSnakeCase = (str) =>
  str.replace(/([A-Z])/g, "_$1").toLowerCase();

const getAppParamValue = (
  paramName,
  { defaultValue = undefined, removeFromUrl = false } = {}
) => {
  if (!isBrowser) return defaultValue;

  const key = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const urlValue = urlParams.get(paramName);

  if (removeFromUrl) {
    urlParams.delete(paramName);
    const newUrl =
      window.location.pathname +
      (urlParams.toString() ? `?${urlParams.toString()}` : "") +
      window.location.hash;

    window.history.replaceState({}, document.title, newUrl);
  }

  if (urlValue) {
    localStorage.setItem(key, urlValue);
    return urlValue;
  }

  if (defaultValue !== undefined) {
    localStorage.setItem(key, defaultValue);
    return defaultValue;
  }

  return localStorage.getItem(key);
};

const getAppParams = () => {
  if (!isBrowser) {
    return {
      appId: null,
      token: null,
      fromUrl: null,
      functionsVersion: null,
      appBaseUrl: null,
    };
  }

  return {
    appId: getAppParamValue("app_id"),
    token: getAppParamValue("access_token", { removeFromUrl: true }),
    fromUrl: getAppParamValue("from_url"),
    functionsVersion: getAppParamValue("functions_version"),
    appBaseUrl: getAppParamValue("app_base_url"),
  };
};

export const appParams = getAppParams();