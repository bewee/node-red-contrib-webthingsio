# WebThings IO for Node-RED

Use the devices from your [WebthingsIO](https://webthings.io/) gateway in [Node-RED](https://nodered.org/) for home automation. 

## Setup

Install this addon through the Node-RED addon list (`☰ > Manage palette > Install`).

When you drag in one of the nodes of this addon, you are requested to create a new gateway. For this, you need to enter an access token. In order to obtain it, go to `Settings > Developer > Create local authorization` on your gateway. Make sure that all devices are checked and that "monitor and control" is selected. Then click allow and copy the token from the first text field.