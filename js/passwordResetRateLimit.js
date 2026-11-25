/* Per account limit of the password reset and account confirmation emails. */

// At most PASSWORD_RESET_MAX_REQUESTS keys per PASSWORD_RESET_WINDOW, and no new
// key while the previous one of the current window is still valid. The counters
// live on the account document, written with the key by the same merge: they
// are shared by every node of a cluster and survive a restart.
var PASSWORD_RESET_WINDOW = 15 * 60 * 1000;
var PASSWORD_RESET_MAX_REQUESTS = 3;

// Returns the counters to store with the new key, or null when no key may be
// issued now. The caller answers the same way in both cases.
var nextPasswordResetRequest = function (account, now) {
    account = account || {};
    var windowStart = Number(account.passwordResetWindowStart);
    if (!account.passwordResetWindowStart || !isFinite(windowStart) ||
            windowStart > now || now - windowStart >= PASSWORD_RESET_WINDOW) {
        return {passwordResetWindowStart: now, passwordResetCount: 1};
    }
    var count = Number(account.passwordResetCount);
    count = isFinite(count) && count > 0 ? Math.floor(count) : 0;
    if (count >= PASSWORD_RESET_MAX_REQUESTS) {
        return null;
    }
    var expiresAt = Number(account.passwordResetExpiresAt);
    if (account.passwordResetKey && isFinite(expiresAt) && expiresAt > now) {
        return null;
    }
    return {passwordResetWindowStart: windowStart, passwordResetCount: count + 1};
};
