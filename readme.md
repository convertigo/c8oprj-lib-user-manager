


# lib_UserManager

The lib_UserManager enables your projects to include user management and authentication in your apps. This library will handle :

- user login with user/password using a salted password security
- user login using OpenID




For more technical informations : [documentation](./project.md)

- [Installation](#installation)
- [Mobile Library](#mobile-library)
    - [Shared Components](#shared-components)
        - [ConfirmAccount](#confirmaccount)
        - [DeleteAccount](#deleteaccount)
        - [ForgotPassword](#forgotpassword)
        - [LoginComponent](#logincomponent)


## Installation

1. In your Convertigo Studio click on ![](https://github.com/convertigo/convertigo/blob/develop/eclipse-plugin-studio/icons/studio/project_import.gif?raw=true "Import a project in treeview") to import a project in the treeview
2. In the import wizard

   ![](https://github.com/convertigo/convertigo/blob/develop/eclipse-plugin-studio/tomcat/webapps/convertigo/templates/ftl/project_import_wzd.png?raw=true "Import Project")
   
   paste the text below into the `Project remote URL` field:
   <table>
     <tr><td>Usage</td><td>Click the copy button at the end of the line</td></tr>
     <tr><td>To contribute</td><td>

     ```
     lib_UserManager=https://github.com/convertigo/c8oprj-lib-user-manager.git:branch=master
     ```
     </td></tr>
     <tr><td>To simply use</td><td>

     ```
     lib_UserManager=https://github.com/convertigo/c8oprj-lib-user-manager/archive/master.zip
     ```
     </td></tr>
    </table>
3. Click the `Finish` button. This will automatically import the __lib_UserManager__ project


## Mobile Library

### Shared Components

#### ConfirmAccount

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>appName</td><td></td>
</tr>
<tr>
<td>imgUrl</td><td></td>
</tr>
<tr>
<td>resetKey</td><td></td>
</tr>
</table>

**events**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>PasswordChangedError</td><td></td>
</tr>
<tr>
<td>PasswordChangedOk</td><td></td>
</tr>
</table>

#### DeleteAccount

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>appName</td><td></td>
</tr>
<tr>
<td>imgUrl</td><td></td>
</tr>
<tr>
<td>moretext</td><td></td>
</tr>
<tr>
<td>resetKey</td><td></td>
</tr>
</table>

**events**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>PasswordChangedError</td><td></td>
</tr>
<tr>
<td>PasswordChangedOk</td><td></td>
</tr>
</table>

#### ForgotPassword

**variables**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>appName</td><td></td>
</tr>
<tr>
<td>imgUrl</td><td></td>
</tr>
<tr>
<td>resetKey</td><td></td>
</tr>
</table>

**events**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>PasswordChangedError</td><td></td>
</tr>
<tr>
<td>PasswordChangedOk</td><td></td>
</tr>
</table>

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
<tr>
<td>logoWidth</td><td></td>
</tr>
<tr>
<td>scope</td><td>Additional Scope to be added to the standard Scope. This will be concatenated to to the scopr string. For Azure AD start with a + sign
</td>
</tr>
<tr>
<td>tenantid</td><td>The tenant ID you want to restrict to, leave blank for no tenant.
</td>
</tr>
</table>

**events**

<table>
<tr>
<th>name</th><th>comment</th>
</tr>
<tr>
<td>login</td><td>This event will be fired when a login occurs :
	Check out.error and out.message  for login errors
	The out.user will be user logged in
</td>
</tr>
</table>



