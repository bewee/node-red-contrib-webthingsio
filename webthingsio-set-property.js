module.exports = function(RED) {
    function WebthingsioSetPropertyNode(config) {
        RED.nodes.createNode(this, config);
        if (!config.gateway) {
            this.error('Gateway missing!');
            return;
        }
        this.gateway = RED.nodes.getNode(config.gateway);
        if (!this.gateway) {
            this.error('Gateway not found!');
            return;
        }
        if (!this.gateway.webthingsEmitter) {
            this.error('WebthingsClient not found!');
            return;
        }
        this.on('input', async (msg) => {
            if (typeof config.thing !== 'string') {
                this.error('Thing name invalid!');
                return;
            }
            if (typeof config.property !== 'string') {
                this.error('Property name invalid!');
                return;
            }
            let value;
            if (config.useInjected) {
                value = msg.payload;
            } else {
                value = config.input;
            }
            if (typeof value !== 'string') {
                value = JSON.stringify(value);
            }
            try {
                await this.gateway.webthingsEmitter.setProperty(
                    config.thing,
                    config.property,
                    value,
                );
            } catch (ex) {
                this.error(`Failed to set property: ${ex}`);
            }
        });
    }
    RED.nodes.registerType(
        'webthingsio-set-property',
        WebthingsioSetPropertyNode,
    );
};
