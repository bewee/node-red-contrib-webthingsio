# WebThings IO for Node-RED

Use the devices from your [WebthingsIO](https://webthings.io/) gateway in [Node-RED](https://nodered.org/) for home automation. 

![image](https://user-images.githubusercontent.com/44091658/114248760-d5718f00-9998-11eb-8eb4-44c6e41848a5.png)

## Setup

The simplest way to setup Node-RED for your webthings gateway is to install [this](https://github.com/bewee/node-red-extension) addon.

Of course, you can also use this addon in an already existing Node-RED instance: Install this addon through the Node-RED addon list (`☰ > Manage palette > Install`).

When you drag in one of the nodes of this addon, you are requested to create a new gateway. For this, you need to enter an access token. In order to obtain it, go to `Settings > Developer > Create local authorization` on your gateway. Make sure that all devices are checked and that "monitor and control" is selected. Then click allow and copy the token from the first text field.

# Settings

This addon provides some customization options through entries in your `settings.js` file:

| setting name | definition |
|---|---|
| `webthingsioGatewayReconnectInterval` | Milliseconds after which to reattempt connecting when the connection was lost |
| `webthingsioGatewayShorterLabels` | Use shorter node names? |
| `webthingsioGatewayLimitInputLen` | Number of characters to limit the length of the input/value in the node name to |
