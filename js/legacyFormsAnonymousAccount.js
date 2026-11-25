/* Server-side authentication guard for legacy C8Oforms anonymous accounts. */
var hasLegacyFormsAnonymousAccountShape = function (userId, accountDocument) {
    var user = userId == null ? "" : String(userId);
    return /^[0-9a-f]{64}$/.test(user) && !!accountDocument && !accountDocument.error &&
            !accountDocument.c8oSecurity && accountDocument._id == user &&
            !!accountDocument.account;
};

var isInventoriedLegacyFormsAnonymousAccount = function (userId, accountDocument) {
    var user = userId == null ? "" : String(userId);
    if (!hasLegacyFormsAnonymousAccountShape(user, accountDocument)) { return false; }

    // An exact inventory entry remains authoritative even when an old account
    // has been edited and its email no longer matches its document ID.
    var symbols = com.twinsoft.convertigo.engine.Engine.theApp.databaseObjectsManager;
    var configured = symbols.symbolsGetValue("lib_UserManager.legacyFormsAnonymousAccountIds");
    if (configured != null) {
        // Compiled as a ${name} reference: a %ENV% value is resolved.
        configured = symbols.getCompiledValue("${lib_UserManager.legacyFormsAnonymousAccountIds}");
    }
    if (configured != null && String(configured).replace(/^\s+|\s+$/g, "") != "") {
        var listed = String(configured).split(/[\s,;]+/);
        var matched = false;
        for (var i = 0; i < listed.length; i++) {
            if (!listed[i]) { continue; }
            if (!/^[0-9a-f]{64}$/.test(listed[i])) {
                throw new java.lang.SecurityException("Invalid legacy anonymous account inventory");
            }
            if (listed[i] == user) { matched = true; }
        }
        return matched;
    }
    return false;
};

var isLegacyFormsAnonymousAccount = function (userId, accountDocument) {
    var user = userId == null ? "" : String(userId);
    if (!hasLegacyFormsAnonymousAccountShape(user, accountDocument)) { return false; }
    if (isInventoriedLegacyFormsAnonymousAccount(user, accountDocument)) { return true; }
    var symbols = com.twinsoft.convertigo.engine.Engine.theApp.databaseObjectsManager;

    // The remaining checks are heuristics for accounts not in the inventory.
    if (accountDocument.account.email != user) { return false; }

    var digest = org.apache.commons.codec.digest.DigestUtils;
    var account = accountDocument.account;
    var hash = account.hashPassword == null ? "" : String(account.hashPassword);
    var salt = account.salt == null ? "" : String(account.salt);

    // Matches the credentials set by the old publication flow. This also covers
    // orphan accounts whose form or group document has since been removed.
    if (salt && /^[0-9a-f]{40}$/i.test(hash)) {
        var legacyHash = String(digest.sha1Hex(user + "+" + salt));
        if (java.security.MessageDigest.isEqual(
                new java.lang.String(legacyHash).getBytes("UTF-8"),
                new java.lang.String(hash.toLowerCase()).getBytes("UTF-8"))) {
            return true;
        }
    }
    if (salt && hash.indexOf("pbkdf2-sha256$") == 0) {
        var parts = hash.split("$");
        var iterations = Number(parts[1]);
        if (parts.length == 3 && /^[0-9]+$/.test(parts[1]) &&
                iterations >= 100000 && iterations <= 500000) {
            try {
                var decodedSalt = java.util.Base64.getDecoder().decode(salt);
                var expected = java.util.Base64.getDecoder().decode(parts[2]);
                if (decodedSalt.length == 32 && expected.length == 32) {
                    var spec = new javax.crypto.spec.PBEKeySpec(
                        new java.lang.String(user).toCharArray(), decodedSalt, iterations, 256);
                    var actual = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
                        .generateSecret(spec).getEncoded();
                    spec.clearPassword();
                    if (java.security.MessageDigest.isEqual(actual, expected)) {
                        return true;
                    }
                }
            } catch (ignoredMalformedHash) {
                // A malformed hash is not proof that this is a Forms account.
            }
        }
    }

    // The relation checks apply only when Forms is installed alongside this
    // shared library. They preserve unrelated accounts with 64-hex IDs.
    var formsProject = null;
    try { formsProject = symbols.getOriginalProjectByName("C8Oforms"); }
    catch (missingForms) { return false; }
    if (formsProject == null) { return false; }

    var fsclient = com.twinsoft.convertigo.engine.Engine.theApp.couchDbManager.getFullSyncClient();
    var query = new java.util.HashMap();
    query.put("key", JSON.stringify(user));
    query.put("reduce", "false");
    query.put("limit", "501");
    query.put("include_docs", "true");

    // The lib_FullSyncGrp membership views only list the documents with its reserved ACL, and the legacy
    // anonymous memberships are not migrated to it: they are searched directly.
    var membershipQuery = new org.codehaus.jettison.json.JSONObject(JSON.stringify({
        selector: { type: "c8oGrp", user: user }, limit: 501
    }));
    var found = JSON.parse(String(fsclient.postFind("c8ofullsyncgrp", membershipQuery)));
    if (!found || found.error || !found.docs || found.docs.length >= 501) {
        throw new java.lang.SecurityException("Unable to verify legacy anonymous account groups");
    }
    var groups = { rows: found.docs.map(function (doc) { return { id: doc._id, value: doc.group, doc: doc }; }) };
    for (var g = 0; g < groups.rows.length; g++) {
        var member = groups.rows[g];
        var group = !member || member.value == null ? "" : String(member.value);
        var prefix = "_C8O_HIDDEN_";
        if (group.indexOf(prefix + "published_") != 0) { continue; }
        var publishedId = group.substring(prefix.length);
        if (!/^published_[A-Za-z0-9_-]+$/.test(publishedId) ||
                /_anonymous$|_pwa_document$/.test(publishedId)) { continue; }
        if (String(digest.sha256Hex(publishedId)) != user ||
                String(digest.sha256Hex(user + ":" + group)) != String(member.id)) { continue; }
        if (member.doc && (member.doc.c8oSecurity || member.doc.type != "c8oGrp" ||
                member.doc.user != user || member.doc.group != group)) { continue; }
        return true;
    }

    var siblings = JSON.parse(String(fsclient.getView("c8oforms_fs", "published_forms_anonymous", "all", query)));
    if (!siblings || siblings.error || !siblings.rows || siblings.rows.length >= 501) {
        throw new java.lang.SecurityException("Unable to verify legacy anonymous Forms documents");
    }
    for (var s = 0; s < siblings.rows.length; s++) {
        var row = siblings.rows[s];
        var siblingId = !row || row.id == null ? "" : String(row.id);
        if (!/^published_[A-Za-z0-9_-]+_anonymous$/.test(siblingId)) { continue; }
        var parentId = siblingId.substring(0, siblingId.length - "_anonymous".length);
        if (String(digest.sha256Hex(parentId)) != user) { continue; }
        if (row.doc && (row.doc.c8oSecurity || row.doc["~c8oAcl"] != user)) { continue; }
        return true;
    }
    return false;
};

var warnLegacyFormsAnonymousAccountGuard = function (message) {
    if (typeof log != "undefined" && log && typeof log.warn == "function") {
        log.warn(message);
    }
};

// Modes of lib_UserManager.legacyFormsAnonymousAuthMode:
// - enforce (default, also used for an empty or invalid value): block the
//   inventoried IDs and the accounts the evidence below classifies;
// - inventory: block only the IDs of lib_UserManager.legacyFormsAnonymousAccountIds;
// - observe: log the matches without blocking;
// - off: disable the guard (immediate roll back).
var getLegacyFormsAnonymousAccountAuthMode = function () {
    var rawMode;
    try {
        var modeSymbols = com.twinsoft.convertigo.engine.Engine.theApp.databaseObjectsManager;
        rawMode = modeSymbols.symbolsGetValue("lib_UserManager.legacyFormsAnonymousAuthMode");
        if (rawMode != null) {
            // Compiled as a ${name} reference: a %ENV% value is resolved.
            rawMode = modeSymbols.getCompiledValue("${lib_UserManager.legacyFormsAnonymousAuthMode}");
        }
    } catch (unavailableMode) {
        warnLegacyFormsAnonymousAccountGuard("Legacy Forms anonymous auth guard mode unavailable; enforced");
        return "enforce";
    }
    var mode = rawMode == null ? "" : String(rawMode).replace(/^\s+|\s+$/g, "").toLowerCase();
    if (mode == "") { return "enforce"; }
    if (mode != "off" && mode != "observe" && mode != "inventory" && mode != "enforce") {
        warnLegacyFormsAnonymousAccountGuard("Invalid legacy Forms anonymous auth guard mode; enforced");
        return "enforce";
    }
    return mode;
};

var shouldRejectLegacyFormsAnonymousAccount = function (userId, accountDocument, authPath) {
    var mode = getLegacyFormsAnonymousAccountAuthMode();
    if (mode == "off") { return false; }

    try {
        // The inventory mode blocks only IDs independently verified in the
        // exact inventory; the other modes also use the Forms evidence.
        var matched = mode == "inventory"
            ? isInventoriedLegacyFormsAnonymousAccount(userId, accountDocument)
            : isLegacyFormsAnonymousAccount(userId, accountDocument);
        if (matched) {
            var path = authPath == "token" ? "token" : "password";
            warnLegacyFormsAnonymousAccountGuard("Legacy Forms anonymous account matched on " + path + " path (" + mode + ")");
        }
        return mode != "observe" && matched;
    } catch (classificationFailure) {
        // An unavailable view or malformed inventory is not evidence that a
        // legitimate account should lose access. Never include account IDs.
        warnLegacyFormsAnonymousAccountGuard("Legacy Forms anonymous auth guard classification failed; allowing authentication");
        return false;
    }
};
