const {getInputValue} = require('./webthingsio-helpers');

module.exports = function(RED) {
    function WebthingsioExecuteActionNode(config) {
        RED.nodes.createNode(this, config);
        if (!config.gateway) {
            this.error(RED._('webthingsio-execute-action.gatewayMissing'));
            return;
        }
        this.gateway = RED.nodes.getNode(config.gateway);
        if (!this.gateway) {
            this.error(RED._('webthingsio-execute-action.gatewayNotFound'));
            return;
        }
        if (!this.gateway.webthingsEmitter) {
            // eslint-disable-next-line max-len
            this.error(RED._('webthingsio-execute-action.webthingsClientNotFound'));
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
                    done(RED._('webthingsio-execute-action.thingNameInvalid'));
                } else {
                    this.error(
                        RED._('webthingsio-execute-action.thingNameInvalid'),
                        msg,
                    );
                }
                return;
            }
            const decodedThingId = decodeURIComponent(config.thing);
            if (typeof config.action !== 'string') {
                if (done) {
                    done(RED._('webthingsio-execute-action.actionNameInvalid'));
                } else {
                    this.error(
                        RED._('webthingsio-execute-action.actionNameInvalid'),
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
                        RED._('webthingsio-execute-action.parseInputFailed')
                            .replace('%error', e),
                    );
                } else {
                    this.error(
                        RED._('webthingsio-execute-action.parseInputFailed')
                            .replace('%error', e),
                        msg,
                    );
                }
                return;
            }
            try {
                await this.gateway.webthingsEmitter.executeAction(
                    decodedThingId,
                    config.action,
                    value,
                );
                done();
            } catch (ex) {
                const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
                if (done) {
                    done(
                        RED._('webthingsio-execute-action.executeActionFailed')
                            .replace('%error', e),
                    );
                } else {
                    this.error(
                        RED._('webthingsio-execute-action.executeActionFailed')
                            .replace('%error', e),
                        msg,
                    );
                }
            }
        });
    }

    RED.nodes.registerType(
        'webthingsio-execute-action',
        WebthingsioExecuteActionNode,
    );
};
