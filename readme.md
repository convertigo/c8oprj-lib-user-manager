


# lib_UserManager

The lib_UserManager enables your projects to include user management and authentication in your apps. This library will handle :

- user login with user/password using a salted password security
- user login using OpenID (Google, Azure & linkedin)

When using user/password, the library will use the **lib_usermanager_fullsync** database to store userids and salted/hashed password



# Symbols :

|--------------------------------------|-------------------------------------------|
|lib_UserManager.adminPassword.secret  | LDAP admin account password               |
|lib_UserManager.adminUser	           | LDAP admin account user                   |
|lib_UserManager.ldapBasePath		   | LDAP Search Root Path                     |
|lib_UserManager.ldapDomainName		   | LDAP DOMAIN Name                          |
|lib_UserManager.ldapServer            | LDAP server address:port                  |



For more technical informations : [documentation](./project.md)

- [Installation](#installation)
- [Sequences](#sequences)
    - [AddUser](#adduser)
    - [DeleteUser](#deleteuser)
    - [ForgotPassword](#forgotpassword)
    - [GetUserAttribute](#getuserattribute)
    - [HashAndSalt](#hashandsalt)
    - [ListUsers](#listusers)
    - [ModifyPassword](#modifypassword)
    - [SetUserAttribute](#setuserattribute)
    - [SignIn](#signin)
    - [SignInAD](#signinad)
    - [SignInADBulk](#signinadbulk)
    - [SignInAdPostGroups](#signinadpostgroups)


## Installation

1. In your Convertigo Studio use `File->Import->Convertigo->Convertigo Project` and hit the `Next` button
2. In the dialog `Project remote URL` field, paste the text below:
   <table>
     <tr><td>Usage</td><td>Click the copy button</td></tr>
     <tr><td>To contribute</td><td>

     ```
     lib_UserManager=https://github.com/convertigo/c8oprj-lib-user-manager.git:branch=8.0.X
     ```
     </td></tr>
     <tr><td>To simply use</td><td>

     ```
     lib_UserManager=https://github.com/convertigo/c8oprj-lib-user-manager/archive/8.0.X.zip
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
<td>password</td><td>The inital password. (User will be able to change it afterwards)</td>
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
<td>forgotPasswordPageFullPath</td><td>Full path to the Forgot password page responsible for calling the ForgotPassword Sequence with the new password and the reset password key as arguments</td>
</tr>
<tr>
<td>newPassword</td><td>New password to be set</td>
</tr>
<tr>
<td>passwordResetKey</td><td>Password reset key</td>
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

### SignInAdPostGroups



