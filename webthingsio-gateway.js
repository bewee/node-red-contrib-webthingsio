const WebThingsEmitter = require('./webthingsio-webthings-emitter');
const semver = require('semver');

module.exports = function(RED) {
    function WebthingsioGatewayNode(config) {
        RED.nodes.createNode(this, config);
        this.host = config.host;
        this.port = +config.port;
        this.https = config.https;
        this.accessToken = config.accessToken;
        this.skipValidation = config.skipValidation;
        this.webthingsEmitter = new WebThingsEmitter(
            RED,
            this,
            this.host,
            this.port,
            this.accessToken,
            this.https,
            this.skipValidation,
            RED.settings.webthingsioGatewayReconnectInterval || 5,
        );
        this.on('close', () => {
            this.webthingsEmitter.disconnect();
        });
    }

    RED.nodes.registerType(
        'webthingsio-gateway',
        WebthingsioGatewayNode,
        {
            settings: {
                webthingsioGatewayReconnectInterval: {
                    value: 5,
                    exportable: false,
                },
                webthingsioGatewayShorterLabels: {
                    value: false,
                    exportable: true,
                },
                webthingsioGatewayLimitInputLen: {
                    value: 15,
                    exportable: true,
                },
            },
        },
    );

    const redversion = RED.version();
    const version = redversion.substr(0, redversion.indexOf('-'));
    if (!semver.satisfies(version, '>=1.3.0')) {
        // eslint-disable-next-line max-len
        this.gateway.log(this.RED._('webthingsio-gateway.manuallyAddingClientCore'));
        RED.httpAdmin.get(
            // eslint-disable-next-line max-len
            '/resources/node-red-contrib-webthingsio/webthingsio-client-core.js',
            function(req, res) {
                const options = {
                    root: __dirname,
                    dotfiles: 'deny',
                };
                res.set(
                    'Cache-Control',
                    'public, max-age=31557600, s-maxage=31557600',
                );
                res.sendFile('webthingsio-client-core.js', options);
            },
        );
    }
};
