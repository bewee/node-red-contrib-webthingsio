const WebThingsEmitter = require('./webthingsio-webthings-emitter');

module.exports = function(RED) {
    function WebthingsioGatewayNode(config) {
        RED.nodes.createNode(this, config);
        this.host = config.host;
        this.port = +config.port;
        this.https = config.https;
        this.accessToken = config.accessToken;
        this.skipValidation = config.skipValidation;
        this.webthingsEmitter = new WebThingsEmitter(
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

    RED.httpAdmin.get(
        '/webthingsio/js/webthingsio-client-core.js',
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
};
