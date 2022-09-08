


# lib_UserManager

The lib_UserManager enables your projects to include user management and authentication in your apps. This library will handle :

- user login with user/password using a salted password security
- user login using OpenID (Google, Azure & linkedin)

When using user/password, the library will use the **lib_usermanager_fullsync** database to store userids and salted/hashed password






For more technical informations : [documentation](./project.md)

- [Installation](#installation)
- [Mobile Library](#mobile-library)
    - [Shared Components](#shared-components)
        - [ForgotPassword](#forgotpassword)
        - [LoginComponent](#logincomponent)


## Installation

1. In your Convertigo Studio use `File->Import->Convertigo->Convertigo Project` and hit the `Next` button
2. In the dialog `Project remote URL` field, paste the text below:
   <table>
     <tr><td>Usage</td><td>Click the copy button</td></tr>
     <tr><td>To contribute</td><td>

     ```
     lib_UserManager=https://github.com/convertigo/c8oprj-lib-user-manager.git:branch=7.9.0.1
     ```
     </td></tr>
     <tr><td>To simply use</td><td>

     ```
     lib_UserManager=https://github.com/convertigo/c8oprj-lib-user-manager/archive/7.9.0.1.zip
     ```
     </td></tr>
    </table>
3. Click the `Finish` button. This will automatically import the __lib_UserManager__ project


## Mobile Library

### Shared Components

#### ForgotPassword

#### LoginComponent

This component handle a login / password form.
And uses the lib_UserManager

The component will check user / password and if successful will autenticate the user. When the user is authenticated, the component will fire a 'login' event that you can handle with a SubscribeHandler. use this event to close a modal page or to push/root a new page when the user is authenticated




**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>enableAzureADLogin</td><td>Set to false to disable login with AzureAD</td>
</tr>
<tr>
<td>enableCancelDismiss</td><td>Set to true if you want a cancel button to be displayed causing a Modal Page dismiss</td>
</tr>
<tr>
<td>enableGoogleLogin</td><td>Set to false to disable loggin with google</td>
</tr>
<tr>
<td>enableLinkedInLogin</td><td>Set to false to disable login with LinkedIn</td>
</tr>
<tr>
<td>logoImage</td><td>A logo image to be displayed over the login form (64x64)</td>
</tr>
</table>



