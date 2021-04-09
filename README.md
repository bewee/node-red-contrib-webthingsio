# WebThings IO for Node-RED

Use the devices from your [WebthingsIO](https://webthings.io/) gateway in [Node-RED](https://nodered.org/) for home automation. 

## Setup

The simplest way to setup Node-RED for your webthings gateway is to install [this](https://github.com/bewee/node-red-extension) addon.

Of course, you can also use this addon in an already existing Node-RED instance: Install this addon through the Node-RED addon list (`☰ > Manage palette > Install`).

When you drag in one of the nodes of this addon, you are requested to create a new gateway. For this, you need to enter an access token. In order to obtain it, go to `Settings > Developer > Create local authorization` on your gateway. Make sure that all devices are checked and that "monitor and control" is selected. Then click allow and copy the token from the first text field.