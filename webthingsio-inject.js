module.exports = function(RED) {
    function WebthingsioInjectNode(config) {
        RED.nodes.createNode(this, config);
        if (!config.gateway) {
            this.error(RED._('webthingsio-inject.gatewayMissing'));
            return;
        }
        this.gateway = RED.nodes.getNode(config.gateway);
        if (!this.gateway) {
            this.error(RED._('webthingsio-inject.gatewayNotFound'));
            return;
        }
        if (!this.gateway.webthingsEmitter) {
            this.error(RED._('webthingsio-inject.webthingsClientNotFound'));
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
        const decodedThingId = decodeURIComponent(config.thing);
        switch (config.injectOn) {
            case 'property changed':
                this.gateway.webthingsEmitter.on(
                    'propertyChanged',
                    (thing, property, value) => {
                        let msg;
                        if (decodedThingId === '*') {
                            msg = {
                                thing: thing,
                                property: property,
                                value: value,
                            };
                        } else if (
                            decodedThingId === thing &&
                            config.property === '*'
                        ) {
                            msg = {
                                property: property,
                                value: value,
                            };
                        } else if (
                            decodedThingId === thing &&
                            config.property === property
                        ) {
                            msg = value;
                        } else {
                            return;
                        }
                        this.send({
                            payload: msg,
                        });
                    },
                );
                break;
            case 'event raised':
                this.gateway.webthingsEmitter.on(
                    'eventRaised',
                    (thing, event, data) => {
                        let msg;
                        if (config.thing === '*') {
                            msg = {
                                thing: thing,
                                event: event,
                                data: data,
                            };
                        } else if (
                            decodedThingId === thing &&
                            config.event === '*'
                        ) {
                            msg = {
                                event: event,
                                data: data,
                            };
                        } else if (
                            decodedThingId === thing &&
                            config.event === event
                        ) {
                            msg = data;
                        } else {
                            return;
                        }
                        this.send({
                            payload: msg,
                        });
                    },
                );
                break;
            case 'action executed':
                this.gateway.webthingsEmitter.on(
                    'actionTriggered',
                    (thing, action, input) => {
                        let msg;
                        if (config.thing === '*') {
                            msg = {
                                thing: thing,
                                action: action,
                                input: input,
                            };
                        } else if (
                            decodedThingId === thing &&
                            config.action === '*'
                        ) {
                            msg = {
                                action: action,
                                input: input,
                            };
                        } else if (
                            decodedThingId === thing &&
                            config.action === action
                        ) {
                            msg = input;
                        } else {
                            return;
                        }
                        this.send({
                            payload: msg,
                        });
                    },
                );
                break;
            case 'connect state changed':
                this.gateway.webthingsEmitter.on(
                    'connectStateChanged',
                    (thing, state) => {
                        let msg;
                        if (config.thing === '*') {
                            msg = {
                                thing: thing,
                                state: state,
                            };
                        } else if (decodedThingId === thing) {
                            msg = state;
                        } else {
                            return;
                        }
                        this.send({
                            payload: msg,
                        });
                    },
                );
                break;
            case 'thing added':
                this.gateway.webthingsEmitter.on('deviceAdded', (thing) => {
                    this.send({
                        payload: thing,
                    });
                });
                break;
            case 'thing modified':
                this.gateway.webthingsEmitter.on('deviceModified', (thing) => {
                    this.send({
                        payload: thing,
                    });
                });
                break;
            case 'thing removed':
                this.gateway.webthingsEmitter.on('deviceRemoved', (thing) => {
                    this.send({
                        payload: thing,
                    });
                });
                break;
            default:
                this.error(RED._('webthingsio-inject.unknownInjectOn'));
                break;
        }
    }
    RED.nodes.registerType('webthingsio-inject', WebthingsioInjectNode);
};
