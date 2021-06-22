const {getInputValue} = require('./webthingsio-helpers');

module.exports = function(RED) {
    function WebthingsioSetPropertyNode(config) {
        RED.nodes.createNode(this, config);
        if (!config.gateway) {
            this.error(RED._('webthingsio-set-property.gatewayMissing'));
            return;
        }
        this.gateway = RED.nodes.getNode(config.gateway);
        if (!this.gateway) {
            this.error(RED._('webthingsio-set-property.gatewayNotFound'));
            return;
        }
        if (!this.gateway.webthingsEmitter) {
            // eslint-disable-next-line max-len
            this.error(RED._('webthingsio-set-property.webthingsClientNotFound'));
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
        this.on('input', async (msg, _send, done) => {
            if (typeof config.thing !== 'string') {
                if (done) {
                    done(RED._('webthingsio-set-property.thingNameInvalid'));
                } else {
                    this.error(
                        RED._('webthingsio-set-property.thingNameInvalid'),
                        msg,
                    );
                }
                return;
            }
            const decodedThingId = decodeURIComponent(config.thing);
            if (typeof config.property !== 'string') {
                if (done) {
                    done(RED._('webthingsio-set-property.propertyNameInvalid'));
                } else {
                    this.error(
                        RED._('webthingsio-set-property.propertyNameInvalid'),
                        msg,
                    );
                }
                return;
            }
            let value;
            try {
                value = getInputValue(RED, this, config, msg);
            } catch (ex) {
                const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
                if (done) {
                    done(
                        RED._('webthingsio-set-property.parseInputFailed')
                            .replace('%error', e),
                    );
                } else {
                    this.error(
                        RED._('webthingsio-set-property.parseInputFailed')
                            .replace('%error', e),
                        msg,
                    );
                }
                return;
            }
            try {
                await this.gateway.webthingsEmitter.setProperty(
                    decodedThingId,
                    config.property,
                    value,
                );
                done();
            } catch (ex) {
                const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
                if (done) {
                    done(
                        RED._('webthingsio-set-property.setPropertyFailed')
                            .replace('%error', e),
                    );
                } else {
                    this.error(
                        RED._('webthingsio-set-property.setPropertyFailed')
                            .replace('%error', e),
                        msg,
                    );
                }
            }
        });
    }
    RED.nodes.registerType(
        'webthingsio-set-property',
        WebthingsioSetPropertyNode,
    );
};
