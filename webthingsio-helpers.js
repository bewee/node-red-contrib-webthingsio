module.exports = {
    getInputValue: function(RED, node, config, msg) {
        let value;
        switch (config.inputMode) {
            case 'injected':
                value = msg.payload;
                break;
            case 'fixed':
                value = config.input;
                break;
            case 'advanced':
                value = RED.util.evaluateNodeProperty(
                    config.input, config.inputt, node, msg,
                );
                break;
        }
        if (typeof value !== 'string') {
            value = JSON.stringify(value);
        }
        return value;
    },
};
