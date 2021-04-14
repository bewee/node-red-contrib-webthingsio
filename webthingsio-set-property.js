const {getInputValue} = require('./webthingsio-helpers');

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
        this.gateway.webthingsEmitter.on('connected', () => {
            this.status({fill: 'green', shape: 'dot', text: 'connected'});
        });
        this.gateway.webthingsEmitter.on('disconnected', () => {
            this.status({fill: 'red', shape: 'ring', text: 'disconnected'});
        });
        this.on('input', async (msg, _send, done) => {
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
                    done('Property name invalid!', msg);
                } else {
                    this.error('Property name invalid!');
                }
                return;
            }
            let value;
            try {
                value = getInputValue(RED, this, config, msg);
            } catch (ex) {
                const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
                if (done) {
                    done(`Failed to parse input value: ${e}`);
                } else {
                    this.error(`Failed to parse input value: ${e}`, msg);
                }
                return;
            }
            try {
                await this.gateway.webthingsEmitter.setProperty(
                    config.thing,
                    config.property,
                    value,
                );
                done();
            } catch (ex) {
                const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
                if (done) {
                    done(`Failed to set property: ${e}`);
                } else {
                    this.error(`Failed to set property: ${e}`, msg);
                }
            }
        });
    }
    RED.nodes.registerType(
        'webthingsio-set-property',
        WebthingsioSetPropertyNode,
    );
};
