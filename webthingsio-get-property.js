module.exports = function(RED) {
    function WebthingsioGetPropertyNode(config) {
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
        this.on('input', async (_msg, send, done) => {
            if (typeof config.thing !== 'string') {
                this.error('Thing name invalid!');
                return;
            }
            if (typeof config.property !== 'string') {
                this.error('Property name invalid!');
                return;
            }
            let value;
            try {
                value = await this.gateway.webthingsEmitter.getProperty(
                    config.thing, config.property,
                );
            } catch (ex) {
                this.error(`Failed to get property: ${ex}`);
                done(`Failed to get property: ${ex}`);
                return;
            }
            send({
                payload: value,
            });
            done();
        });
    }
    RED.nodes.registerType(
        'webthingsio-get-property',
        WebthingsioGetPropertyNode,
    );
};
