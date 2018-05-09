# Automated Let's Encrypt certificate generator on Azure Functions for App Services

> Useful for App Services based on Container / Docker

## Setup
- create *Azure Function App (with Hosting Plan: Consumption)*
- in *Azure Function App* add:
  - Application settings:
    - `WEBSITE_NODE_DEFAULT_VERSION` = `8.10.0`
    - `OPENSSL_PATH` = `D:\Program Files (x86)\Git\usr\bin\openssl.exe`
    - `TEST` = `false`
  - Connection strings:
    - `CLIENT_ID` = *[How to get client id & secret »](https://www.jan-v.nl/post/setting-up-an-azure-active-directory-application-to-retrieve-let%E2%80%99s-encrypt-certificates)*
    - `CLIENT_SECRET` = *[How to get client id & secret »](https://www.jan-v.nl/post/setting-up-an-azure-active-directory-application-to-retrieve-let%E2%80%99s-encrypt-certificates)*
    - `SUBSCRIPTION_ID` = *Azure AD > Subscriptions > Subscription ID*
    - `TENANT` = *Azure AD > Azure Active Directory > Properties > Directory ID*
    - `PFX_PASSWORD` = *Random password*
    - `AZURE_STORAGE_CONNECTION_STRING` = *Connection string to any storage for LE challenges*
    - `AZURE_STORAGE_CONTAINER` = *Container name in storage for LE challenges*
- in *Azure Function App* create function from template: *Timer trigger / Javascript (named: TimerTriggerJS1)*
- copy [wwwroot](/wwwroot/) to *Azure Function App wwwroot*
- run `npm install` in *wwwroot*
- change parameters in file [index.js](/wwwroot/TimerTriggerJS1/index.js) for your App Service
- in your app add redirect from path `/.well-known/acme-challenge/:key` to `https://«storage_name».blob.core.windows.net/«storage_container»/:key` (example for: [expressjs](example.router.js))
- run *TimerTriggerJS1* function
