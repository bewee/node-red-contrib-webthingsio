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
        this.gateway.webthingsEmitter.on('connected', () => {
            this.status({fill: 'green', shape: 'dot', text: 'connected'});
        });
        this.gateway.webthingsEmitter.on('disconnected', () => {
            this.status({fill: 'red', shape: 'ring', text: 'disconnected'});
        });
        this.on('input', async (msg, send, done) => {
            if (typeof config.thing !== 'string') {
                if (done) {
                    done('Thing name invalid!');
                } else {
                    this.error('Thing name invalid!', msg);
                }
                return;
            }
            if (typeof config.property !== 'string') {
                if (done) {
                    done('Property name invalid!');
                } else {
                    this.error('Property name invalid!', msg);
                }
                return;
            }
            let value;
            try {
                value = await this.gateway.webthingsEmitter.getProperty(
                    config.thing, config.property,
                );
            } catch (ex) {
                const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
                if (done) {
                    done(`Failed to get property: ${e}`);
                } else {
                    this.error(`Failed to get property: ${e}`, msg);
                }
                return;
            }
            msg.payload = value;
            send(msg);
            done();
        });
    }
    RED.nodes.registerType(
        'webthingsio-get-property',
        WebthingsioGetPropertyNode,
    );
};
