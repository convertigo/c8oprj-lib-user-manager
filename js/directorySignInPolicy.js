/* Server-side policy of the LDAP sign-in called directly by a client. */

// A call is direct when the HTTP request running it targets lib_UserManager
// itself, resolved as the engine does (__project parameter, else the URL).
// A sequence of another project calling it through a sequence step runs within
// the request of that project, which keeps its own login policy (C8Oforms LoginAD).
var isDirectLibUserManagerRequest = function (request) {
    if (request == null) { return false; }
    var project = request.getParameter("__project");
    if (project == null) {
        var matched = /\/projects\/([^\/]+)\//.exec(String(request.getRequestURI()));
        project = matched ? matched[1] : "";
    }
    return String(project) == "lib_UserManager";
};

// Groups whose members may sign in directly, from the server configuration
// only: an empty list (the default) refuses the direct calls, "*" accepts any
// directory user.
var getDirectLdapSignInGroups = function () {
    var symbols = com.twinsoft.convertigo.engine.Engine.theApp.databaseObjectsManager;
    var configured = symbols.symbolsGetValue("lib_UserManager.ldapDirectSignInGroups");
    if (configured == null) { return []; }
    // Compiled as a ${name} reference: a %ENV% value is resolved.
    configured = String(symbols.getCompiledValue("${lib_UserManager.ldapDirectSignInGroups}"));
    var groups = [];
    var listed = configured.split(/[,;\n]+/);
    for (var i = 0; i < listed.length; i++) {
        var group = listed[i].replace(/^\s+|\s+$/g, "");
        if (group) { groups.push(group); }
    }
    return groups;
};

var isDirectLdapSignInAllowed = function (allowedGroups, userGroups) {
    for (var i = 0; i < allowedGroups.length; i++) {
        if (allowedGroups[i] == "*") { return true; }
        for (var j = 0; userGroups != null && j < userGroups.length; j++) {
            if (userGroups[j] != null && String(userGroups[j]).toLowerCase() == allowedGroups[i].toLowerCase()) {
                return true;
            }
        }
    }
    return false;
};

// RFC 4515 escaping of a value placed in an LDAP search filter.
var escapeLdapFilterValue = function (value) {
    return String(value).replace(/[\\*()\u0000]/g, function (c) {
        return "\\" + ("0" + c.charCodeAt(0).toString(16)).slice(-2);
    });
};
