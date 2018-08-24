# GitHub-Discord-HookRouter
A Lightweight API that routes github webhook requests to Discord. Allows easy management of multiple webhooks. Features signature verification, rate-limit handling, and cool logging.

This API allows you to send requests to multiple Discord webhooks which is sent from GitHub. As you guessed it, this API will act as the POSTman in delivering the requests.

**Notes**:
1) Use only one webhook URL on all your repository (which should be the link to reach this API).
2) It is highly recommended to protect this endpoint with signature verification to prevent unauthorized access to your API. More info about creating a secure secret [here](https://developer.github.com/webhooks/securing/).
3) This API also supports SSL verification.
4) The content type should be set to `application/json` when the GitHub webhook is being created, or it will cause unintended issues as Discord can't parse any other content-type.

## Instructions on setting it up!
1) Copy paste the [config.template.json](https://github.com/Khaazz/GitHub-Discord-HookRouter/template/config-template.json) in [configs/config.json](https://github.com/Khaazz/GitHub-Discord-HookRouter/configs/).
```js
{
    "port": "3000",
    "auth": true,
    "authorization": "Secret key"
}
```

2) If you want to secure your API using the github webhook secret, set `auth` to ̀`true` and set the property of `authorization` as the secret key.

3) Copy paste the [webhooks.template.json](https://github.com/Khaazz/GitHub-Discord-HookRouter/template/webhooks-template.json) in [configs/webhooks.json](https://github.com/Khaazz/GitHub-Discord-HookRouter/configs/).
```js
[
    {
        "name": "webhook",
        "id": "webhookID",
        "token": "webhookToken"
    }
]
```
The webhooks config contains the array of all webhooks you want to manage.
Provide a name, webhook's id, and token and you are good to go.

4) Start this API by executing `node src/app.js` in the console. [PM2 script](https://github.com/Khaazz/GitHub-Discord-HookRouter/scripts/start.js) is located in the scripts folder which could be used if you want to use PM2.
Alternatively, you can use `npm start` or `npm pm2start`.

5) If you want to quickly host this API, you could use ngrok; which is available [here](https://ngrok.com/).

## Contributions
Feel free to contribute to this project by opening Pull-Request or Issues.
Contributions are always welcome.

## Honorable mentions
Huge thanks to [Santhosh-Annamalai](https://github.com/Santhosh-Annamalai) for being helpful when building this API.
