const webthingsio = {
    fetchGateway: async function(location, gatewayNode) {
        let host = gatewayNode.host;
        if (
            !host ||
            host === '0.0.0.0' ||
            host === '127.0.0.1' ||
            host === 'localhost'
        ) {
            host = window.location.hostname;
        }
        try {
            const res = await fetch(
                // eslint-disable-next-line max-len
                `http${gatewayNode.https ? 's' : ''}://${host}:${gatewayNode.port}/${location}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${gatewayNode.accessToken}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                },
            );
            return await res.json();
        } catch (ex) {
            console.error('Failed to fetch gateway!', ex);
            $('#node-error').text('Gateway connection failed!');
            $('#node-error').show();
        }
    },

    findGatewayNode: function(identifier) {
        let gatewayNode;
        window.RED.nodes.eachConfig((config) => {
            if (config.id === identifier) {
                gatewayNode = config;
            }
        });
        return gatewayNode;
    },

    initSelect: function(node, elements) {
        webthingsio.clearSelect(node);
        elements.forEach((element) => {
            const opt = document.createElement('OPTION');
            opt.innerText = element.text;
            opt.value = element.value;
            node.appendChild(opt);
        });
    },

    clearSelect: function(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    },

    updateThing: async function(propagate = true, allowWildcard = false) {
        if (!$('#node-input--thing').length) {
            return;
        }
        $('div#thing-row').hide();
        webthingsio.clearSelect($('#node-input--thing')[0]);
        const gateway = webthingsio.findGatewayNode(
            $('#node-input-gateway').val(),
        );
        if (gateway) {
            const things = await webthingsio.fetchGateway('things', gateway);
            const elements = things.map((thing) => {
                return {
                    text: thing.title,
                    value: thing.href.substr(thing.href.indexOf('/', 1) + 1),
                };
            });
            if (allowWildcard) {
                elements.unshift({text: 'any', value: '*'});
            }
            webthingsio.initSelect($('#node-input--thing')[0], elements);
            $('div#thing-row').show();
        }
        if (propagate) {
            await webthingsio.updateProperty();
            await webthingsio.updateAction();
        }
    },

    updateA: async function(a, getelements, allowWildcard = false) {
        if (!$(`#node-input--${a}`).length) {
            return;
        }
        $(`div#${a}-row`).hide();
        webthingsio.clearSelect($(`#node-input--${a}`)[0]);
        const gateway = webthingsio.findGatewayNode(
            $('#node-input-gateway').val(),
        );
        const thing_value = $('#node-input--thing').val();
        if (gateway && thing_value && thing_value !== '*') {
            const thing = await webthingsio.fetchGateway(
                `things/${thing_value}`,
                gateway,
            );
            const elements = getelements(thing);
            if (allowWildcard) {
                elements.unshift({text: 'any', value: '*'});
            }
            webthingsio.initSelect($(`#node-input--${a}`)[0], elements);
            $(`div#${a}-row`).show();
        }
    },

    updateProperty: async function(
        propagate = true,
        allowWildcard = false,
        includeReadOnly = false,
    ) {
        await webthingsio.updateA('property', (thing) => {
            let elements = Object.keys(thing.properties);
            if (!includeReadOnly) {
                elements = elements.filter(
                    (property) => !thing.properties[property].readOnly,
                );
            }
            elements = elements.map((property) => {
                return {
                    text: thing.properties[property].title || property,
                    value: property,
                };
            });
            return elements;
        }, allowWildcard);
        if (propagate) {
            await webthingsio.updatePropertyInput();
        }
    },

    updateAction: async function(propagate = true, allowWildcard = false) {
        await webthingsio.updateA('action', (thing) => {
            return Object.keys(thing.actions)
                .map((action) => {
                    return {
                        text: thing.actions[action].title || action,
                        value: action,
                    };
                });
        }, allowWildcard);
        if (propagate) {
            await webthingsio.updateActionInput();
        }
    },

    updateEvent: async function(allowWildcard = false) {
        await webthingsio.updateA('event', (thing) => {
            return Object.keys(thing.events)
                .map((event) => {
                    return {
                        text: thing.events[event].title || event,
                        value: event,
                    };
                });
        }, allowWildcard);
    },

    updateInput: async function(getdescription, a, propagate) {
        if (!$('#node-input--useInjected').length) {
            return;
        }
        $('div#useInjected-row').hide();
        $('div#input-row').hide();
        $('div#input-row').removeAttr('input-type');
        $('#node-input--input').remove();

        const gateway = webthingsio.findGatewayNode(
            $('#node-input-gateway').val(),
        );
        const thing_value = $('#node-input--thing').val();
        const a_value = $(`#node-input--${a}`).val();

        if (gateway && thing_value && a_value) {
            const thing = await webthingsio.fetchGateway(
                `things/${thing_value}`,
                gateway,
            );
            const description = getdescription(thing, a_value);

            if (description && description.type) {
                let newInputNode;

                if (Array.isArray(description.enum)) {
                    newInputNode = document.createElement('SELECT');
                } else {
                    newInputNode = document.createElement('INPUT');
                }

                newInputNode.id = 'node-input--input';
                newInputNode.style.width = '70%';
                $('div#input-row').append(newInputNode);
                $('div#input-row').attr('input-type', description.type);

                if (Array.isArray(description.enum)) {
                    const elements = description.enum.map((element) => {
                        return {
                            text: element.title || element,
                            value: element,
                        };
                    });
                    webthingsio.initSelect(newInputNode, elements);
                } else {
                    switch (description.type) {
                        case 'boolean':
                            newInputNode.type = 'checkbox';
                            break;
                        case 'number': case 'integer':
                            newInputNode.type = 'number';
                            if (typeof description.maximum === 'number') {
                                newInputNode.max = description.maximum;
                            }
                            if (typeof description.minimum === 'number') {
                                newInputNode.min = description.minimum;
                            }
                            if (description.type === 'integer') {
                                newInputNode.step = 1;
                                newInputNode.pattern = '\\d*';
                            }
                            newInputNode.value = 0;
                            if (newInputNode.max) {
                                newInputNode.value = newInputNode.max;
                            }
                            if (newInputNode.min) {
                                newInputNode.value = newInputNode.min;
                            }
                            break;
                        case 'string':
                            if (description['@type'] === 'ColorProperty') {
                                newInputNode.type = 'color';
                            } else {
                                newInputNode.type = 'text';
                            }
                            break;
                        default:
                            $('#node-input--input').typedInput({
                                type: 'json',
                                types: ['json'],
                            });
                            $('#node-input--input')[0].type = '';
                            $('#node-input--input')[0]
                                .style.position = 'absolute';
                            $('#node-input--input')[0].style.bottom = '9999px';
                            $('#node-input--input')[0].style.right = '9999px';
                            $('#input-row .red-ui-typedInput-container')[0]
                                .style.width = '70%';
                            break;
                    }
                }

                $('div#useInjected-row').show();
            }
        }
        if (propagate) {
            webthingsio.useInjectedChanged(a);
        }
    },

    updatePropertyInput: async function(propagate = true) {
        await webthingsio.updateInput(
            (thing, property_value) => {
                return thing.properties[property_value];
            },
            'property',
            propagate,
        );
    },

    updateActionInput: async function(propagate = true) {
        await webthingsio.updateInput(
            (thing, action_value) => {
                return thing.actions[action_value].input;
            },
            'action',
            propagate,
        );
    },

    useInjectedChanged: function(a) {
        const gateway = webthingsio.findGatewayNode(
            $('#node-input-gateway').val(),
        );
        const thing_value = $('#node-input--thing').val();
        const a_value = $(`#node-input--${a}`).val();
        const useInjected_value = $('#node-input--useInjected').is(':checked');
        if (
            gateway &&
            thing_value &&
            a_value &&
            !useInjected_value &&
            $('#node-input--input').length
        ) {
            $('div#input-row').show();
        } else {
            $('div#input-row').hide();
        }
    },

    updateInjectVisibility: function() {
        if (!webthingsio.findGatewayNode($('#node-input-gateway').val())) {
            $('#injectOn-row').hide();
            $('#thing-row').hide();
            $('#property-row').hide();
            $('#event-row').hide();
            $('#action-row').hide();
            return;
        }
        $('#injectOn-row').show();
        switch ($('#node-input--injectOn').val()) {
            case 'property changed':
                $('#thing-row').show();
                if ($('#node-input--thing').val() === '*') {
                    $('#property-row').hide();
                } else {
                    $('#property-row').show();
                }
                $('#event-row').hide();
                $('#action-row').hide();
                break;
            case 'event raised':
                $('#thing-row').show();
                $('#property-row').hide();
                if ($('#node-input--thing').val() === '*') {
                    $('#event-row').hide();
                } else {
                    $('#event-row').show();
                }
                $('#action-row').hide();
                break;
            case 'action executed':
                $('#thing-row').show();
                $('#property-row').hide();
                $('#event-row').hide();
                if ($('#node-input--thing').val() === '*') {
                    $('#action-row').hide();
                } else {
                    $('#action-row').show();
                }
                break;
            case 'connect state changed':
                $('#thing-row').show();
                $('#property-row').hide();
                $('#event-row').hide();
                $('#action-row').hide();
                break;
            case 'thing added': case 'thing modified': case 'thing removed':
                $('#thing-row').hide();
                $('#property-row').hide();
                $('#event-row').hide();
                $('#action-row').hide();
                break;
        }
    },

    saveA: function(node, a) {
        if (
            $(`#node-input--${a}`).is(':visible') &&
            $(`#node-input--${a}`).val()
        ) {
            node[a] = $(`#node-input--${a}`).val();
        } else {
            node[a] = node._def.defaults[a].value;
        }
    },

    saveThing: function(node) {
        webthingsio.saveA(node, 'thing');
    },

    saveProperty: function(node) {
        webthingsio.saveA(node, 'property');
    },

    saveAction: function(node) {
        webthingsio.saveA(node, 'action');
    },

    saveEvent: function(node) {
        webthingsio.saveA(node, 'event');
    },

    saveInjectOn: function(node) {
        webthingsio.saveA(node, 'injectOn');
    },

    saveUseInjected: function(node) {
        if (
            $('#node-input--useInjected').is(':visible') &&
            $('#node-input--useInjected').val()
        ) {
            node.useInjected = $('#node-input--useInjected').is(':checked');
        } else {
            node.useInjected = node._def.defaults.useInjected.value;
        }
    },

    saveInput: function(node) {
        if (
            $('#node-input--input').length &&
            $('#node-input--input').is(':visible') &&
            $('#node-input--input').val()
        ) {
            let val;
            switch ($('#input-row').attr('input-type')) {
                case 'boolean':
                    val = $('#node-input--input').is(':checked');
                    break;
                case 'object':
                    val = $('#node-input--input').typedInput('value');
                    break;
                default:
                    val = $('#node-input--input').val();
                    break;
            }
            node.input = val;
        } else {
            node.input = node._def.defaults.input.value;
        }
    },

    initializeInput: function(value) {
        switch ($('#input-row').attr('input-type')) {
            case 'boolean':
                $('#node-input--input').prop('checked', value);
                break;
            case 'object':
                $('#node-input--input').typedInput('value', value);
                break;
            default:
                $('#node-input--input').prop('value', value);
                break;
        }
    },
};

window.webthingsio = webthingsio;
