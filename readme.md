


# lib_UserManager

# User management and Authentication for your projects

The lib_UserManager enables your projects to include user management and authentication in your apps. This library will handle :

- user login with user/password using a salted password security
- user login using OpenID (Google, Azure & linkedin)

When using user/password, the library will use the **lib_usermanager_fullsync** database to store userids and salted/hashed password

## Symbols :

| symbol                               | Usage                                     |
|--------------------------------------|-------------------------------------------|
| lib_UserManager.adminPassword.secret | LDAP admin account password               |
| lib_UserManager.adminUser	           | LDAP admin account user                   |
| lib_UserManager.ldapBasePath		   | LDAP Search Root Path                     |
| lib_UserManager.ldapDomainName	   | LDAP DOMAIN Name                          |
| lib_UserManager.ldapServer           | LDAP server address:port, required by SignInAD, SignInADBulk and SignInLDAPBulk (the LDAP server and admin account always come from the symbols) |
| lib_UserManager.smtp.server          | SMTP server address                       |
| lib_UserManager.smtp.port            | SMTP server port                          |
| lib_UserManager.smtp.sauthtype       | SMTP server authentication type           |
| lib_UserManager.smtp.sender          | SMTP sender mail address                  |
| lib_UserManager.smtp.user            | SMTP server user account                  |
| lib_UserManager.smtp.password.secret | SMTP server password                      |
| lib_UserManager.LDAP_USER_ID_ATTRIBUTE | LDAP User ID attribute to search.       |
| lib_UserManager.LDAP_GROUP_OBJECT_CLASS | Object class identifying groups        |
| lib_UserManager.ldapBasePathGroup	   | Base path used to search for LDAP groups |
| lib_UserManager.LDAP_GROUP_DISPLAY_ATTRIBUTE | The display name attribute for groups |
| lib_UserManager.ldapDirectSignInGroups | Groups (comma or semicolon separated) whose members may call SignInLDAPBulk directly from a client; * for any directory user; empty (default) refuses direct calls |
| lib_UserManager.legacyFormsAnonymousAccountIds | Exact legacy Forms account IDs, separated by commas or whitespace; set after inventory for orphan accounts |
| lib_UserManager.legacyFormsAnonymousAuthMode | enforce (default: block inventoried and detected legacy Forms anonymous accounts), inventory (block only inventoried IDs), observe (log without blocking) or off (roll back immediately) |
| lib_UserManager.publicUrl            | Public URL of the server used in the links of the emails, for example https://forms.example.com/convertigo; when empty, the environment variable CONVERTIGO_PUBLIC_URL, then the engine endpoint URL |
| lib_UserManager.resetPassword.emailBody, lib_UserManager.resetPassword.emailBody.LOCALE | Body of the password reset email (ForgotPassword, ForgotPasswordWithBrand), for one LOCALE (en, fr, es, it or zh-CN) or for any |
| lib_UserManager.resetPassword.emailSubject, lib_UserManager.resetPassword.emailSubject.LOCALE | Subject of the password reset email, for one LOCALE or for any |
| lib_UserManager.createAccount.emailBody, lib_UserManager.createAccount.emailBody.LOCALE | Body of the email sent by AddUser, for one LOCALE or for any |
| lib_UserManager.createAccount.emailSubject, lib_UserManager.createAccount.emailSubject.LOCALE | Subject of the email sent by AddUser, for one LOCALE or for any |

The emails take the language of the lang input (en, fr, es, it or zh-CN, else en). Password reset and account confirmation links are valid for 15 minutes.


## Authentication Modes And Required Symbols

<a id="auth-mode-internal"></a>
### Internal Login (SignIn / CheckSecureToken)

No `lib_UserManager.*` symbol is required for the standard internal login (`SignIn`).

`CheckSecureToken` validates JWT signatures with the Convertigo engine property:

- `CRYPTO_PASSPHRASE` (engine property, not a `lib_UserManager.*` symbol)

The password reset and account confirmation emails (`ForgotPassword`, `ForgotPasswordWithBrand`, `ConfirmAccount`) build their links from a trusted base URL, never from the host of the request:

| symbol                               | Required | Usage |
|--------------------------------------|----------|-------|
| lib_UserManager.publicUrl            | no, see below | Public URL of the server, for example `https://forms.example.com/convertigo`; it may reference an environment variable, for example `%CONVERTIGO_PUBLIC_URL%` |

The base URL of the links is the first of:

1. the symbol `lib_UserManager.publicUrl` (an environment variable it references and that is not defined leaves it unset);
2. the environment variable `CONVERTIGO_PUBLIC_URL`;
3. the engine property *Convertigo Server endpoint URL*;
4. the engine property *Convertigo Server local URL* (`-Dconvertigo.engine.application_server.convertigo.url`, set by C8oCloud), unless it targets the local host;
5. in the Studio only, the URL of the request.

Otherwise the sequences answer with an error (`The public URL of the server is not configured`) and send no email: on a server, the request host (`Host` or `X-Convertigo-Request-Host` header) is never used, whatever the account.

Password reset and account confirmation links are valid for 15 minutes. While the link of an account is still valid no new email is sent, and an account receives at most 3 links per 15 minutes; the answer of the sequence is the same in every case.

Accounts created by the anonymous form publication of earlier C8Oforms versions are refused by `SignIn` and `CheckSecureToken`, according to:

| symbol                                          | Required | Usage |
|-------------------------------------------------|----------|-------|
| lib_UserManager.legacyFormsAnonymousAuthMode    | optional | `enforce` (default: refuse the listed accounts and the detected ones), `inventory` (refuse only the listed accounts), `observe` (log without refusing) or `off` |
| lib_UserManager.legacyFormsAnonymousAccountIds  | optional | Exact IDs of these accounts, separated by commas or whitespace |

<a id="emails-language"></a>
### Email Language And Texts

`AddUser`, `CreateAccount`, `ConfirmAccount`, `ForgotPassword` and `ForgotPasswordWithBrand` take a `lang` input: `en`, `fr`, `es`, `it` or `zh-CN` (any other value falls back to `en`). It sets the language of the email, and `ForgotPassword` and `ForgotPasswordWithBrand` add it to the link. A non-empty `emailBody` or `emailSubject` input is used as is; otherwise the text comes from these optional symbols, the one of the locale first:

| symbol                                          | Usage |
|-------------------------------------------------|-------|
| lib_UserManager.resetPassword.emailBody.`<locale>`, lib_UserManager.resetPassword.emailBody | Body of the password reset email (`ForgotPassword`, `ForgotPasswordWithBrand`) |
| lib_UserManager.resetPassword.emailSubject.`<locale>`, lib_UserManager.resetPassword.emailSubject | Subject of the password reset email |
| lib_UserManager.createAccount.emailBody.`<locale>`, lib_UserManager.createAccount.emailBody | Body of the email sent by `AddUser` |
| lib_UserManager.createAccount.emailSubject.`<locale>`, lib_UserManager.createAccount.emailSubject | Subject of the email sent by `AddUser` |

`ConfirmAccount` uses a built-in subject in the language of the email when `emailSubject` is empty.

<a id="auth-mode-ad"></a>
### Active Directory Login (SignInAD / SignInADBulk)

`SignInAD` and `SignInADBulk` are private: call them from a sequence of your project, which applies its own login policy.

| symbol                               | Required | Usage |
|--------------------------------------|----------|-------|
| lib_UserManager.ldapServer           | yes      | Active Directory LDAP URL (`ldap://host:port` or `ldaps://host:port`) |
| lib_UserManager.ldapBasePath         | yes      | Base DN used to search users |
| lib_UserManager.adminUser            | yes      | Service account used to perform LDAP searches |
| lib_UserManager.adminPassword.secret | yes      | Service account password |
| lib_UserManager.ldapDomainName       | optional | Domain prefix automatically prepended to `user` when needed |

<a id="auth-mode-ldap"></a>
### LDAP Login (SignInLDAPBulk)

| symbol                                          | Required | Usage |
|-------------------------------------------------|----------|-------|
| lib_UserManager.ldapServer                      | yes      | LDAP URL (`ldap://host:port` or `ldaps://host:port`) |
| lib_UserManager.ldapBasePath                    | yes      | Base DN used to search users |
| lib_UserManager.ldapBasePathGroup               | yes      | Base DN used to search groups |
| lib_UserManager.adminUser                       | yes      | LDAP service account |
| lib_UserManager.adminPassword.secret            | yes      | LDAP service account password |
| lib_UserManager.LDAP_USER_ID_ATTRIBUTE          | optional | User identifier attribute (default `uid`) |
| lib_UserManager.LDAP_GROUP_OBJECT_CLASS         | optional | LDAP objectClass used to find groups (default `group`) |
| lib_UserManager.LDAP_GROUP_DISPLAY_ATTRIBUTE    | optional | Group display attribute (default `cn`) |
| lib_UserManager.ldapDomainName                  | optional | Domain prefix helper for user login |
| lib_UserManager.ldapDirectSignInGroups          | optional | Groups (comma or semicolon separated) whose members may call `SignInLDAPBulk` directly from a client, `*` for any directory user; empty (default) refuses direct calls. A sequence of another project calling it keeps its own policy |

<a id="auth-mode-oauth-openid"></a>
### OpenID/OAuth Login (Google, Microsoft, LinkedIn, OpenID)

OpenID/OAuth login is handled by `lib_OAuth`.

No additional `lib_UserManager.*` symbol is required for provider configuration.
Configure provider credentials and endpoints in the `lib_OAuth` project symbols.



For more technical informations : [documentation](./project.md)

- [Installation](#installation)
- [Sequences](#sequences)
    - [AddUser](#adduser)
    - [CheckSecureToken](#checksecuretoken)
    - [ConfirmAccount](#confirmaccount)
    - [CreateAccount](#createaccount)
    - [DeleteUser](#deleteuser)
    - [ForgotPassword](#forgotpassword)
    - [ForgotPasswordWithBrand](#forgotpasswordwithbrand)
    - [GenerateSecureToken](#generatesecuretoken)
    - [GetAllAdGroups](#getalladgroups)
    - [GetDomainUsersGroupName](#getdomainusersgroupname)
    - [GetUAllserAttributes](#getuallserattributes)
    - [GetUserAttribute](#getuserattribute)
    - [GetUserByAttributeNameAndValue](#getuserbyattributenameandvalue)
    - [HashAndSalt](#hashandsalt)
    - [ListUsers](#listusers)
    - [ModifyPassword](#modifypassword)
    - [RemoveDraftedAccounts](#removedraftedaccounts)
    - [SetUserAttribute](#setuserattribute)
    - [SignIn](#signin)
    - [SignInAD](#signinad)
    - [SignInADBulk](#signinadbulk)
    - [SignInLDAPBulk](#signinldapbulk)
    - [SignOut](#signout)


## Installation

1. In your Convertigo Studio use `File->Import->Convertigo->Convertigo Project` and hit the `Next` button
2. In the dialog `Project remote URL` field, paste the text below:
   <table>
     <tr><td>Usage</td><td>Click the copy button</td></tr>
     <tr><td>To contribute</td><td>

     ```
     lib_UserManager=https://github.com/convertigo/c8oprj-lib-user-manager.git:branch=8.0.1.X
     ```
     </td></tr>
     <tr><td>To simply use</td><td>

     ```
     lib_UserManager=https://github.com/convertigo/c8oprj-lib-user-manager/archive/8.0.1.X.zip
     ```
     </td></tr>
    </table>
3. Click the `Finish` button. This will automatically import the __lib_UserManager__ project


## Sequences

### AddUser

Adds an user to the Internal Convertigo User database

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>askForPasswordReset</td><td>The user id as a valid email address</td>
</tr>
<tr>
<td>emailBody</td><td>Email content</td>
</tr>
<tr>
<td>emailLogo</td><td>Email logo to be added</td>
</tr>
<tr>
<td>emailSubject</td><td>Email subject</td>
</tr>
<tr>
<td>password</td><td>The inital password. (User will be able to change it afterwards)</td>
</tr>
<tr>
<td>targetApplicationName</td><td>Email where to send the reset password link to</td>
</tr>
<tr>
<td>user</td><td>The user id as a valid email address</td>
</tr>
</table>

### CheckSecureToken

The `CheckSecureToken` sequence verifies the validity of a JWT by checking its structure, expiration, and signature. It extracts the payload, validates the password hash, and manages associated JWT tokens for the user. Additionally, it refreshes the JWT token.

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>token</td><td></td>
</tr>
</table>

### ConfirmAccount

Confirms a user account if a passwordResetKey was provided, or sends an email to the user with a passwordResetKey and allow him to confirm account. It should be called by CreateAccount sequence.

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>email</td><td>Email where to send the reset password link to</td>
</tr>
<tr>
<td>emailLogo</td><td>Email logo to be added</td>
</tr>
<tr>
<td>emailSubject</td><td>Email subject</td>
</tr>
<tr>
<td>lang</td><td>The lang to be used in the email. It can be fr or en</td>
</tr>
<tr>
<td>passwordResetKey</td><td>Password reset key (Optional)</td>
</tr>
<tr>
<td>targetApplicationName</td><td>The Target application name to be used into the email template</td>
</tr>
</table>

### CreateAccount

Creates a user account and sends validation email, to active this account

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>emailLogo</td><td>Email logo to be added</td>
</tr>
<tr>
<td>emailSubject</td><td>Email subject</td>
</tr>
<tr>
<td>lang</td><td>The language to be used into the email. Can be fr or en.</td>
</tr>
<tr>
<td>password</td><td>The inital password. (User will be able to change it afterwards)</td>
</tr>
<tr>
<td>targetApplicationName</td><td>target Application Name</td>
</tr>
<tr>
<td>user</td><td>The user id as a valid email address</td>
</tr>
</table>

### DeleteUser

Deletes an user from the internal Convertigo database

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>user</td><td>The user ID as (The users email address)</td>
</tr>
</table>

### ForgotPassword

Has to be called with email fields not empty to send an email reset link to the user, or with a newPassword an passwordResetKey not empty to excplicitly reset a password

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>email</td><td>Email where to send the reset password link to</td>
</tr>
<tr>
<td>emailBody</td><td>Email content</td>
</tr>
<tr>
<td>emailLogo</td><td>Email logo to be added</td>
</tr>
<tr>
<td>emailSubject</td><td>Email subject</td>
</tr>
<tr>
<td>newPassword</td><td>New password to be set</td>
</tr>
<tr>
<td>passwordResetKey</td><td>Password reset key</td>
</tr>
<tr>
<td>targetApplicationName</td><td>Email where to send the reset password link to</td>
</tr>
</table>

### ForgotPasswordWithBrand

Has to be called with email fields not empty to send an email reset link to the user, or with a newPassword an passwordResetKey not empty to excplicitly reset a password

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>email</td><td>Email where to send the reset password link to</td>
</tr>
<tr>
<td>emailLogo</td><td>Email logo to be added</td>
</tr>
<tr>
<td>emailSubject</td><td>Email subject</td>
</tr>
<tr>
<td>lang</td><td>The lang to be used in the email. It can be fr or en</td>
</tr>
<tr>
<td>newPassword</td><td>New password to be set</td>
</tr>
<tr>
<td>passwordResetKey</td><td>Password reset key</td>
</tr>
<tr>
<td>targetApplicationName</td><td>The Target application name to be used into the email template</td>
</tr>
</table>

### GenerateSecureToken

The `GenerateSecureToken` sequence creates a JWT token with a specified expiration and includes a password hash in the payload. It encodes the token using HMAC SHA256 and appends it to the user's document, managing JWT tokens for secure user authentication.

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>passwordHash</td><td></td>
</tr>
<tr>
<td>tokenExpiration</td><td></td>
</tr>
<tr>
<td>userName</td><td></td>
</tr>
</table>

### GetAllAdGroups

Get all groups available in the AD

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>adminPassword</td><td>The Active Directory admin account password. If not  provided or invalid, the group membership information will not be provided.</td>
</tr>
<tr>
<td>adminUser</td><td>A valid ActiveDirectory Admin Account with read privileges used to search for the user attributes. If this is not provided, the group membership information will not be returned.</td>
</tr>
<tr>
<td>domainNameUser</td><td></td>
</tr>
<tr>
<td>ldapBasePath</td><td>The active directory user user to sign in. May be a valid domain account ex: 'DOMAIN\user' or the user's email ex: 'user@domain.com' or just the users full name ex:  'John doe'</td>
</tr>
<tr>
<td>ldapServer</td><td>The Active Directory server ldap url as ldap(s)://server:port. Mandatory.</td>
</tr>
</table>

### GetDomainUsersGroupName

Gives the localized Domain Users group,  where all users automatically belong

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>adminPassword</td><td>The Active Directory admin account password. If not  provided or invalid, the group membership information will not be provided.</td>
</tr>
<tr>
<td>adminUser</td><td>A valid ActiveDirectory Admin Account with read privileges used to search for the user attributes. If this is not provided, the group membership information will not be returned.</td>
</tr>
<tr>
<td>domainNameUser</td><td></td>
</tr>
<tr>
<td>ldapBasePath</td><td>The active directory user user to sign in. May be a valid domain account ex: 'DOMAIN\user' or the user's email ex: 'user@domain.com' or just the users full name ex:  'John doe'</td>
</tr>
<tr>
<td>ldapServer</td><td>The Active Directory server ldap url as ldap(s)://server:port. Mandatory.</td>
</tr>
<tr>
<td>sAMAccountName</td><td></td>
</tr>
</table>

### GetUAllserAttributes

Gets a given attribute from an user account

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>attribute</td><td>The attribute name</td>
</tr>
<tr>
<td>user</td><td>The user where we have to get the attribute from</td>
</tr>
</table>

### GetUserAttribute

Gets a given attribute from an user account

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>attribute</td><td>The attribute name</td>
</tr>
<tr>
<td>user</td><td>The user where we have to get the attribute from</td>
</tr>
</table>

### GetUserByAttributeNameAndValue

Gets an user by attribute name and value

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>attrName</td><td></td>
</tr>
<tr>
<td>attrValue</td><td></td>
</tr>
</table>

### HashAndSalt

Utility sequence to Hash and Salt passwords

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>hash</td><td></td>
</tr>
<tr>
<td>password</td><td></td>
</tr>
<tr>
<td>salt</td><td></td>
</tr>
</table>

### ListUsers

Lists users from the internal Convertigo User database

### ModifyPassword

Modify a password for a given user

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>password</td><td>New password to be set</td>
</tr>
<tr>
<td>user</td><td>User email to set the new password on</td>
</tr>
</table>

### RemoveDraftedAccounts

Remove any drafts accounts not confirmed by email. Has to be scheduled.

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>doDelete</td><td>Perform effectively deletions operations if true</td>
</tr>
<tr>
<td>hours</td><td>Any account aged more than this number of hours, will be deleted. </td>
</tr>
</table>

### SetUserAttribute

Sets a given attribute on an user account if the account doesn't exists, an account will be created with a fake radom password


**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>attribute</td><td>The attribute name</td>
</tr>
<tr>
<td>user</td><td>The user where we have to set the attribute on</td>
</tr>
<tr>
<td>value</td><td>The attribute value</td>
</tr>
</table>

### SignIn

Performs a user sign in for a given user with its id (email) and password

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>password</td><td>The user's password</td>
</tr>
<tr>
<td>rememberMe</td><td>Stay logged in for an extended period, even after closing the browser</td>
</tr>
<tr>
<td>user</td><td>The userID (user's email)</td>
</tr>
</table>

### SignInAD

Sign in using an ActiveDirectory account. Will also return the list of groups the user belongs to

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>adminPassword</td><td>The Active Directory admin account password. If not  provided or invalid, the group membership information will not be provided.</td>
</tr>
<tr>
<td>adminUser</td><td>A valid ActiveDirectory Admin Account with read privileges used to search for the user attributes. If this is not provided, the group membership information will not be returned.</td>
</tr>
<tr>
<td>domainNameUser</td><td></td>
</tr>
<tr>
<td>ldapBasePath</td><td>The active directory user user to sign in. May be a valid domain account ex: 'DOMAIN\user' or the user's email ex: 'user@domain.com' or just the users full name ex:  'John doe'</td>
</tr>
<tr>
<td>ldapServer</td><td>The Active Directory server ldap url as ldap(s)://server:port. Mandatory.</td>
</tr>
<tr>
<td>password</td><td>The users password</td>
</tr>
<tr>
<td>user</td><td>The active directory user user to sign in. May be a valid domain account ex: 'DOMAIN\user' or the user's email ex: 'user@domain.com' or just the users full name ex:  'John doe'</td>
</tr>
</table>

### SignInADBulk

Sign in using an ActiveDirectory account. Will also return the list of groups the user belongs to

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>adminPassword</td><td>The Active Directory admin account password. If not  provided or invalid, the group membership information will not be provided.</td>
</tr>
<tr>
<td>adminUser</td><td>A valid ActiveDirectory Admin Account with read privileges used to search for the user attributes. If this is not provided, the group membership information will not be returned.</td>
</tr>
<tr>
<td>domainNameUser</td><td></td>
</tr>
<tr>
<td>ldapBasePath</td><td>The active directory user user to sign in. May be a valid domain account ex: 'DOMAIN\user' or the user's email ex: 'user@domain.com' or just the users full name ex:  'John doe'</td>
</tr>
<tr>
<td>ldapServer</td><td>The Active Directory server ldap url as ldap(s)://server:port. Mandatory.</td>
</tr>
<tr>
<td>password</td><td>The users password</td>
</tr>
<tr>
<td>user</td><td>The active directory user user to sign in. May be a valid domain account ex: 'DOMAIN\user' or the user's email ex: 'user@domain.com' or just the users full name ex:  'John doe'</td>
</tr>
</table>

### SignInLDAPBulk

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>adminPassword</td><td>The LDAP service account password. If not  provided or invalid, the group membership information will not be provided.</td>
</tr>
<tr>
<td>adminUser</td><td>A valid LDAP service Account with read privileges used to search for the user attributes. If this is not provided, the group membership information will not be returned.</td>
</tr>
<tr>
<td>domainNameUser</td><td>Domain name to prefix to user in case of azure AD</td>
</tr>
<tr>
<td>groupAttribute</td><td>Object class identifying groups</td>
</tr>
<tr>
<td>groupDisplayAttribute</td><td>The display name attribute for groups</td>
</tr>
<tr>
<td>ldapBasePath</td><td>The LDAP user user to sign in. May be a valid domain account ex: 'DOMAIN\user' or the user's email ex: 'user@domain.com' or just the users full name ex:  'John doe'</td>
</tr>
<tr>
<td>ldapBasePathGroup</td><td>Base path used to search for LDAP groups</td>
</tr>
<tr>
<td>ldapServer</td><td>The LDAP server url as ldap(s)://server:port. Mandatory.</td>
</tr>
<tr>
<td>password</td><td>The LDAP users password</td>
</tr>
<tr>
<td>user</td><td>The LDAP user to sign in. May be a valid domain account ex: 'DOMAIN\user' or the user's email ex: 'user@domain.com' or just the users full name ex:  'John doe'</td>
</tr>
<tr>
<td>userIdAttribute</td><td>User ID attribute to search</td>
</tr>
</table>

### SignOut

The `SignOut` sequence logs out the authenticated user by removing their associated JWT token from the user's document and clearing the authenticated user session.

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>token</td><td></td>
</tr>
</table>


