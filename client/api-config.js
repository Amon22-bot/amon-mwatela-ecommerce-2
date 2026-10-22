/*
 * Public API address configuration.
 * For a separate frontend/backend deployment, set AM_API_BASE_URL to the
 * backend's HTTPS origin here. When the backend serves the site itself,
 * production automatically uses the current origin.
 */
(function configureApiBase() {
    const hostname = window.location.hostname;
    const localDevelopment = window.location.protocol === "file:" ||
        hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    const configuredOrigin = window.AM_API_BASE_URL ||
        (localDevelopment ? "http://localhost:5000" : window.location.origin);

    window.AM_API_BASE_URL = configuredOrigin.replace(/\/+$/, "");
})();
