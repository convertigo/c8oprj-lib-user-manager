/* Base URL of the links sent by email (password reset, account confirmation). */

// The links do not use context.getConvertigoUrl(), which follows the Host or
// X-Convertigo-Request-Host header of the request when the engine has no
// endpoint configured. The base comes from the first configured source, in
// this order:
//   1. the symbol lib_UserManager.publicUrl (it may reference an environment
//      variable, %NAME%; an undefined variable leaves it unset),
//   2. the environment variable CONVERTIGO_PUBLIC_URL,
//   3. the engine property "Convertigo Server endpoint URL",
//   4. the engine property "Convertigo Server local URL"
//      (convertigo.engine.application_server.convertigo.url), unless it targets
//      the local host, its default outside a configured server,
//   5. in the Studio only, the URL of the request (a developer workstation);
// otherwise no link is sent. Returns {url, source}, the url ending with a slash
// as the links add "projects/...".
var PUBLIC_URL_PATTERN = /^https?:\/\/[^\/\s?#@\\]+(\/[^\s?#\\]*)?$/;

var publicUrlValue = function (value) {
    var text = value == null ? "" : String(value).replace(/^\s+|\s+$/g, "");
    // An environment variable the engine could not resolve stays as %NAME%.
    return text == "" || /%[^%\s]*%/.test(text) ? null : text;
};

var publicUrlIsLocal = function (url) {
    var host = String(url).replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
    host = host.charAt(0) == "[" ? host.substring(0, host.indexOf("]") + 1) : host.split(":")[0];
    return host == "localhost" || /\.localhost$/.test(host) || /^127\./.test(host) ||
        host == "[::1]" || host == "0.0.0.0" || host == "[::]";
};

var publicUrlBase = function (value, source) {
    if (!PUBLIC_URL_PATTERN.test(value)) {
        throw new Error("Invalid public URL for the account emails (" + source + ")");
    }
    return {url: value.charAt(value.length - 1) == "/" ? value : value + "/", source: source};
};

var trustedPublicUrl = function (settings) {
    var configured = [
        ["lib_UserManager.publicUrl", settings.symbol],
        ["CONVERTIGO_PUBLIC_URL", settings.environment],
        ["Convertigo Server endpoint URL", settings.endpoint]
    ];
    for (var i = 0; i < configured.length; i++) {
        var value = publicUrlValue(configured[i][1]);
        if (value != null) {
            return publicUrlBase(value, configured[i][0]);
        }
    }
    var localUrl = publicUrlValue(settings.localUrl);
    if (localUrl != null && PUBLIC_URL_PATTERN.test(localUrl) && !publicUrlIsLocal(localUrl)) {
        return publicUrlBase(localUrl, "Convertigo Server local URL");
    }
    if (settings.studio === true && settings.requestUrl) {
        var requestUrl = publicUrlValue(settings.requestUrl());
        if (requestUrl != null) {
            return publicUrlBase(requestUrl, "Studio request");
        }
    }
    throw new Error("The public URL of the server is not configured: set lib_UserManager.publicUrl, " +
        "the environment variable CONVERTIGO_PUBLIC_URL or the engine endpoint");
};

var configuredPublicUrl = function () {
    var engine = com.twinsoft.convertigo.engine;
    var properties = engine.EnginePropertiesManager;
    return trustedPublicUrl({
        // Compiled as a reference: a %NAME% value of the symbol is resolved.
        symbol: engine.Engine.theApp.databaseObjectsManager.getCompiledValue("${lib_UserManager.publicUrl=}"),
        environment: java.lang.System.getenv("CONVERTIGO_PUBLIC_URL"),
        endpoint: properties.getProperty(properties.PropertyName.APPLICATION_SERVER_CONVERTIGO_ENDPOINT),
        localUrl: properties.getProperty(properties.PropertyName.APPLICATION_SERVER_CONVERTIGO_URL),
        studio: engine.Engine.isStudioMode() == true,
        requestUrl: function () {
            return context.getConvertigoUrl();
        }
    }).url;
};
