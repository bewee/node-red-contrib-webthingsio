const EventEmitter = require('events');
const {WebThingsClient} = require('webthings-client');

class WebThingsEmitter extends EventEmitter {

    constructor(
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
            this.gateway.error(`WebthingsClient Error: ${error}`);
        });
        webthingsClient.on('close', () => {
            this.webthingsClient = null;
            this.gateway.warn(
                // eslint-disable-next-line max-len
                `WebthingsClient lost. Reconnecting in ${this.reconnectInterval} seconds`,
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
        webthingsClient.on('connectStateChanged', (device_id, state) => {
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
                    await webthingsClient.subscribeEvents(
                        device, device.events,
                    );
                }
                if (this.dead) {
                    return;
                }
                this.webthingsClient = webthingsClient;
                this.gateway.log('WebthingsClient connected');
                for (const cmd in this.queue) {
                    this[cmd.fn](... cmd.args);
                }
                this.emit('connected');
            }, 100);
        } catch (e) {
            this.webthingsClient = null;
            this.gateway.warn(
                // eslint-disable-next-line max-len
                `Failed to connect WebthingsClient. Retrying in ${this.reconnectInterval} seconds`,
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
            throw 'Cannot find thing!';
        }
        const property =
            device &&
            device.properties &&
            device.properties[property_name];
        if (!property) {
            throw 'Cannot find property!';
        }
        const type = property.description && property.description.type;
        if (!type) {
            throw 'Cannot find type!';
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
            throw 'Failed to set value!';
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
            throw 'Cannot find thing!';
        }
        const action = device && device.actions && device.actions[action_name];
        if (!action) {
            throw 'Cannot find action!';
        }
        const inputdescription = action.description && action.description.input;
        if (inputdescription) {
            if (!inputdescription.type) {
                throw 'Cannot find input type!';
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
                        throw 'Failed to parse input!';
                    }
                    break;
                default:
                    inp = input || '';
                    break;
            }
            try {
                await action.execute(inp);
            } catch (ex) {
                throw 'Failed to execute!';
            }
        } else {
            try {
                await action.execute();
            } catch (ex) {
                throw 'Failed to execute!';
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
            throw 'Cannot find thing!';
        }
        const property =
            device &&
            device.properties &&
            device.properties[property_name];
        if (!property) {
            throw 'Cannot find property!';
        }
        try {
            return await property.getValue();
        } catch (ex) {
            throw 'Failed to get value!';
        }
    }

    disconnect() {
        if (this.webthingsClient) {
            this.webthingsClient.removeAllListeners();
            this.webthingsClient.disconnect();
            this.webthingsClient = null;
        }
        this.dead = true;
        this.gateway.log('WebthingsClient disconnected');
        this.emit('disconnected');
    }
}

module.exports = WebThingsEmitter;
