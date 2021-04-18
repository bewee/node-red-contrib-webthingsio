const EventEmitter = require('events');
const {WebThingsClient} = require('webthings-client');

class WebThingsEmitter extends EventEmitter {

    constructor(
        RED,
        gateway,
        address,
        port,
        token,
        useHttps,
        skipValidation,
        reconnectInterval,
    ) {
        super();
        this.queue = [];
        this.RED = RED;
        this.gateway = gateway;
        this.address = address;
        this.port = port;
        this.token = token;
        this.useHttps = useHttps;
        this.skipValidation = skipValidation;
        this.reconnectInterval = reconnectInterval;
        this.connect();
    }

    async connect() {
        if (this.dead) {
            return;
        }
        const webthingsClient = new WebThingsClient(
            this.address,
            this.port,
            this.token,
            this.useHttps,
            this.skipValidation,
        );
        webthingsClient.on('error', (error) => {
            this.gateway.error(`${
                this.RED._('webthingsio-gateway.webthingsClientError')
            }: ${error}`);
        });
        webthingsClient.on('close', () => {
            this.webthingsClient = null;
            this.gateway.warn(
                // eslint-disable-next-line max-len
                this.RED._('webthingsio-gateway.webthingsClientLost')
                    .replace('%interval', `${this.reconnectInterval}`),
            );
            this.emit('disconnected');
            setTimeout(this.connect.bind(this), this.reconnectInterval * 1000);
        });
        webthingsClient.on(
            'propertyChanged',
            (device_id, property_name, value) => {
                this.emit('propertyChanged', device_id, property_name, value);
            },
        );
        webthingsClient.on(
            'actionTriggered',
            (device_id, action_name, input) => {
                this.emit('actionTriggered', device_id, action_name, input);
            },
        );
        webthingsClient.on('eventRaised', (device_id, event_name, info) => {
            this.emit('eventRaised', device_id, event_name, info);
        });
        webthingsClient.on('connectStateChanged', async (device_id, state) => {
            if (state && this.webthingsClient) {
                try {
                    const device =
                        await this.webthingsClient.getDevice(device_id);
                    await webthingsClient.subscribeEvents(
                        device, device.events,
                    );
                } catch (ex) {
                    this.gateway.warn(
                        // eslint-disable-next-line max-len
                        this.RED._('webthingsio-gateway.webthingsClientSubscribeFailed')
                            .replace('%thing', device_id)
                            .replace('%error', JSON.stringify(ex)),
                    );
                }
            }
            this.emit('connectStateChanged', device_id, state);
        });
        webthingsClient.on('deviceModified', (device_id) => {
            this.emit('deviceModified', device_id);
        });
        webthingsClient.on('deviceAdded', async (device_id) => {
            this.emit('deviceAdded', device_id);
            if (!this.webthingsClient) {
                return;
            }
            const device = await this.webthingsClient.getDevice(device_id);
            await this.webthingsClient.subscribeEvents(device, device.events);
        });
        webthingsClient.on('deviceRemoved', (device_id) => {
            this.emit('deviceRemoved', device_id);
        });
        try {
            await webthingsClient.connect();

            setTimeout(async () => {
                const devices = await webthingsClient.getDevices();
                for (const device of devices) {
                    try {
                        await webthingsClient.subscribeEvents(
                            device, device.events,
                        );
                    } catch (ex) {
                        this.gateway.warn(
                            // eslint-disable-next-line max-len
                            this.RED._('webthingsio-gateway.webthingsClientSubscribeFailed')
                                .replace('%device', device.id)
                                .replace('%error', JSON.stringify(ex)),
                        );
                    }
                }
                if (this.dead) {
                    return;
                }
                this.webthingsClient = webthingsClient;
                this.gateway.log(
                    this.RED._('webthingsio-gateway.webthingsClientConnected'),
                );
                for (const cmd of this.queue) {
                    this[cmd.fn](... cmd.args);
                }
                this.emit('connected');
            }, 100);
        } catch (e) {
            this.webthingsClient = null;
            this.gateway.warn(
                this.RED._('webthingsio-gateway.webthingsClientConnectFailed')
                    .replace('%interval', `${this.reconnectInterval}`),
            );
            this.emit('disconnected');
            setTimeout(this.connect.bind(this), this.reconnectInterval * 1000);
        }
    }

    async setProperty(device_id, property_name, value) {
        if (!this.webthingsClient) {
            this.queue.push({
                fn: 'setProperty',
                args: [device_id, property_name, value],
            });
            return;
        }
        let device;
        try {
            device = await this.webthingsClient.getDevice(device_id);
        } catch (ex) {
            const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
            throw this.RED._('webthingsio-gateway.cannotFindThing')
                .replace('%error', e);
        }
        const property =
            device &&
            device.properties &&
            device.properties[property_name];
        if (!property) {
            throw this.RED._('webthingsio-gateway.cannotFindProperty');
        }
        const type = property.description && property.description.type;
        if (!type) {
            throw this.RED._('webthingsio-gateway.cannotFindType');
        }
        let val;
        switch (type) {
            case 'number':
                val = +value || 0;
                break;
            case 'integer':
                val = parseInt(+value || 0);
                break;
            case 'boolean':
                val = value === 'true' || +value ? true : false;
                break;
            default:
                val = value || '';
                break;
        }
        try {
            await property.setValue(val);
        } catch (ex) {
            const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
            throw this.RED._('webthingsio-gateway.setValueFailed')
                .replace('%error', e);
        }
    }

    async executeAction(device_id, action_name, input) {
        if (!this.webthingsClient) {
            this.queue.push({
                fn: 'executeAction',
                args: [device_id, action_name, input],
            });
            return;
        }
        let device;
        try {
            device = await this.webthingsClient.getDevice(device_id);
        } catch (ex) {
            const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
            throw this.RED._('webthingsio-gateway.cannotFindThing')
                .replace('%error', e);
        }
        const action = device && device.actions && device.actions[action_name];
        if (!action) {
            throw this.RED._('webthingsio-gateway.cannotFindAction');
        }
        const inputdescription = action.description && action.description.input;
        if (inputdescription) {
            if (!inputdescription.type) {
                throw this.RED._('webthingsio-gateway.cannotFindType');
            }
            let inp;
            switch (inputdescription.type) {
                case 'number':
                    inp = +input || 0;
                    break;
                case 'integer':
                    inp = parseInt(+input || 0);
                    break;
                case 'boolean':
                    inp = input === 'true' || +input ? true : false;
                    break;
                case 'object':
                    try {
                        inp = JSON.parse(input || '{}');
                    } catch (ex) {
                        const e =
                            typeof ex === 'string' ? ex : JSON.stringify(ex);
                        throw this.RED._('webthingsio-gateway.parseInputFailed')
                            .replace('%error', e);
                    }
                    break;
                default:
                    inp = input || '';
                    break;
            }
            try {
                await action.execute(inp);
            } catch (ex) {
                const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
                throw this.RED._('webthingsio-gateway.executeFailed')
                    .replace('%error', e);
            }
        } else {
            try {
                await action.execute();
            } catch (ex) {
                const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
                throw this.RED._('webthingsio-gateway.executeFailed')
                    .replace('%error', e);
            }
        }
    }

    async getProperty(device_id, property_name) {
        if (!this.webthingsClient) {
            this.queue.push({
                fn: 'getProperty',
                args: [device_id, property_name],
            });
            return;
        }
        let device;
        try {
            device = await this.webthingsClient.getDevice(device_id);
        } catch (ex) {
            const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
            throw this.RED._('webthingsio-gateway.cannotFindThing')
                .replace('%error', e);
        }
        const property =
            device &&
            device.properties &&
            device.properties[property_name];
        if (!property) {
            throw this.RED._('webthingsio-gateway.cannotFindProperty');
        }
        try {
            return await property.getValue();
        } catch (ex) {
            const e = typeof ex === 'string' ? ex : JSON.stringify(ex);
            throw this.RED._('webthingsio-gateway.getValueFailed')
                .replace('%error', e);
        }
    }

    disconnect() {
        if (this.webthingsClient) {
            this.webthingsClient.removeAllListeners();
            this.webthingsClient.disconnect();
            this.webthingsClient = null;
        }
        this.dead = true;
        this.gateway.log(
            this.RED._('webthingsio-gateway.webthingsClientDisconnected'),
        );
        this.emit('disconnected');
    }
}

module.exports = WebThingsEmitter;
