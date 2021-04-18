module.exports = function(RED) {
    function WebthingsioGetPropertyNode(config) {
        RED.nodes.createNode(this, config);
        if (!config.gateway) {
            this.error(RED._('webthingsio-get-property.gatewayMissing'));
            return;
        }
        this.gateway = RED.nodes.getNode(config.gateway);
        if (!this.gateway) {
            this.error(RED._('webthingsio-get-property.gatewayNotFound'));
            return;
        }
        if (!this.gateway.webthingsEmitter) {
            // eslint-disable-next-line max-len
            this.error(RED._('webthingsio-get-property.webthingsClientNotFound'));
            return;
        }
        this.gateway.webthingsEmitter.on('connected', () => {
            this.status({
                fill: 'green',
                shape: 'dot',
                text: 'node-red:common.status.connected',
            });
        });
        this.gateway.webthingsEmitter.on('disconnected', () => {
            this.status({
                fill: 'red',
                shape: 'ring',
                text: 'node-red:common.status.disconnected',
            });
        });
        this.on('input', async (msg, send, done) => {
            if (typeof config.thing !== 'string') {
                if (done) {
                    done(RED._('webthingsio-get-property.thingNameInvalid'));
                } else {
                    this.error(
                        RED._('webthingsio-get-property.thingNameInvalid'),
                        msg,
                    );
                }
                return;
            }
            if (typeof config.property !== 'string') {
                if (done) {
                    done(RED._('webthingsio-get-property.propertyNameInvalid'));
                } else {
                    this.error(
                        RED._('webthingsio-get-property.propertyNameInvalid'),
                        msg,
                    );
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
                    done(
                        RED._('webthingsio-get-property.getPropertyFailed')
                            .replace('%error', e),
                    );
                } else {
                    this.error(
                        RED._('webthingsio-get-property.getPropertyFailed')
                            .replace('%error', e),
                        msg,
                    );
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
