(() => {
    async function fetchGateway(location, gatewayNode) {
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
    }

    function findGatewayNode(identifier) {
        let gatewayNode;
        window.RED.nodes.eachConfig((config) => {
            if (config.id === identifier) {
                gatewayNode = config;
            }
        });
        return gatewayNode;
    }

    function initSelect(node, elements) {
        clearSelect(node);
        elements.forEach((element) => {
            const opt = document.createElement('OPTION');
            opt.innerText = element.text;
            opt.value = element.value;
            node.appendChild(opt);
        });
    }

    function clearSelect(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    async function updateA(a, getelements, allowWildcard = false) {
        if (!$(`#node-input--${a}`).length) {
            return;
        }
        $(`div#${a}-row`).hide();
        clearSelect($(`#node-input--${a}`)[0]);
        const gateway = findGatewayNode(
            $('#node-input-gateway').val(),
        );
        const thing_value = $('#node-input--thing').val();
        if (gateway && thing_value && thing_value !== '*') {
            const thing = await fetchGateway(
                `things/${thing_value}`,
                gateway,
            );
            const elements = getelements(thing);
            if (allowWildcard) {
                elements.unshift({text: 'any', value: '*'});
            }
            initSelect($(`#node-input--${a}`)[0], elements);
            $(`div#${a}-row`).show();
        }
    }

    function saveA(node, a) {
        if (
            $(`#node-input--${a}`).is(':visible')
        ) {
            node[a] = $(`#node-input--${a}`).val();
        } else {
            node[a] = node._def.defaults[a].value;
        }
    }

    async function updateInput(getdescription, a, propagate) {
        if (!$('#node-input--inputMode').length) {
            return;
        }
        $('div#inputMode-row').hide();
        hideFixedInput();
        hideAdvancedInput();

        const gateway = findGatewayNode(
            $('#node-input-gateway').val(),
        );
        const thing_value = $('#node-input--thing').val();
        const a_value = $(`#node-input--${a}`).val();

        if (gateway && thing_value && a_value) {
            const thing = await fetchGateway(
                `things/${thing_value}`,
                gateway,
            );
            const description = getdescription(thing, a_value);

            if (description && description.type) {
                buildFixedInput(description);
                $('div#inputMode-row').show();
            }
        }
        if (propagate) {
            $('#node-input--inputMode')[0].selectedIndex = 0;
            webthingsio.inputModeChanged(a);
        }
    }

    function buildFixedInput(description) {
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
            initSelect(newInputNode, elements);
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
    }

    function getFixedInputValue() {
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
        return val;
    }

    function setFixedInputValue(value) {
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
    }

    function hideFixedInput() {
        $('div#input-row').hide();
        $('div#input-row').removeAttr('input-type');
        $('#node-input--input').remove();
    }

    function hideAdvancedInput() {
        $('div#input-advanced-row').hide();
        $('#node-input--input-advanced').typedInput('value', '');
        $('#node-input--input-advanced').typedInput(
            'type', 'msg',
        );
    }

    function showAdvancedInput() {
        $('div#input-advanced-row').show();
        $('#node-input--input-advanced')[0].type = '';
        $('#input-advanced-row .red-ui-typedInput-container')[0]
            .style.width = '70%';
        $('#input-advanced-row .red-ui-typedInput-container div input')[0]
            .style.width = 'calc(100% - 3px)';
        $('#input-advanced-row .red-ui-typedInput-container div input')[0]
            .style.borderRadius = '4px';
    }

    function injectShow(rows) {
        const allrows = ['injectOn', 'thing', 'property', 'event', 'action'];
        for (const row in allrows) {
            if (rows.includes(row)) {
                $(`#${row}-row`).show();
            } else {
                $(`#${row}-row`).hide();
            }
        }
    }

    const webthingsio = {

        updateThing: async function(propagate = true, allowWildcard = false) {
            if (!$('#node-input--thing').length) {
                return;
            }
            $('div#thing-row').hide();
            clearSelect($('#node-input--thing')[0]);
            const gateway = findGatewayNode(
                $('#node-input-gateway').val(),
            );
            if (gateway) {
                const things = await fetchGateway('things', gateway);
                const elements = things.map((thing) => {
                    const thing_id =
                        thing.href.substr(thing.href.indexOf('/', 1) + 1);
                    return {
                        text: thing.title || thing_id,
                        value: thing_id,
                    };
                });
                if (allowWildcard) {
                    elements.unshift({text: 'any', value: '*'});
                }
                initSelect($('#node-input--thing')[0], elements);
                $('div#thing-row').show();
            }
            if (propagate) {
                await webthingsio.updateProperty();
                await webthingsio.updateAction();
            }
        },

        updateProperty: async function(
            propagate = true,
            allowWildcard = false,
            includeReadOnly = false,
        ) {
            await updateA('property', (thing) => {
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
            await updateA('action', (thing) => {
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
            await updateA('event', (thing) => {
                return Object.keys(thing.events)
                    .map((event) => {
                        return {
                            text: thing.events[event].title || event,
                            value: event,
                        };
                    });
            }, allowWildcard);
        },

        updatePropertyInput: async function(propagate = true) {
            await updateInput(
                (thing, property_value) => {
                    return thing.properties[property_value];
                },
                'property',
                propagate,
            );
        },

        updateActionInput: async function(propagate = true) {
            await updateInput(
                (thing, action_value) => {
                    return thing.actions[action_value].input;
                },
                'action',
                propagate,
            );
        },

        inputModeChanged: function(a) {
            const gateway = findGatewayNode(
                $('#node-input-gateway').val(),
            );
            const thing_value = $('#node-input--thing').val();
            const a_value = $(`#node-input--${a}`).val();
            const inputMode_value = $('#node-input--inputMode').val();
            if (
                gateway &&
                thing_value &&
                a_value &&
                $('#node-input--input').length
            ) {
                switch (inputMode_value) {
                    case 'fixed':
                        $('div#input-row').show();
                        hideAdvancedInput();
                        return;
                    case 'advanced':
                        $('div#input-row').hide();
                        showAdvancedInput();
                        return;
                }
            }
            $('div#input-row').hide();
            $('div#input-advanced-row').hide();
        },

        updateInjectVisibility: function() {
            if (!findGatewayNode($('#node-input-gateway').val())) {
                injectShow([]);
                return;
            }
            $('#injectOn-row').show();
            switch ($('#node-input--injectOn').val()) {
                case 'property changed':
                    if ($('#node-input--thing').val() === '*') {
                        injectShow(['thing']);
                    } else {
                        injectShow(['thing', 'property']);
                    }
                    break;
                case 'event raised':
                    if ($('#node-input--thing').val() === '*') {
                        injectShow(['thing']);
                    } else {
                        injectShow(['thing', 'event']);
                    }
                    break;
                case 'action executed':
                    if ($('#node-input--thing').val() === '*') {
                        injectShow(['thing']);
                    } else {
                        injectShow(['thing', 'action']);
                    }
                    break;
                case 'connect state changed':
                    injectShow(['thing']);
                    break;
                case 'thing added': case 'thing modified': case 'thing removed':
                    injectShow([]);
                    break;
            }
        },

        saveThing: function(node) {
            saveA(node, 'thing');
        },

        saveProperty: function(node) {
            saveA(node, 'property');
        },

        saveAction: function(node) {
            saveA(node, 'action');
        },

        saveEvent: function(node) {
            saveA(node, 'event');
        },

        saveInjectOn: function(node) {
            saveA(node, 'injectOn');
        },

        saveInputMode: function(node) {
            saveA(node, 'inputMode');
        },

        saveInput: function(node) {
            node.input = node._def.defaults.input.value;
            node.inputt = node._def.defaults.inputt.value;
            if ($('#node-input--input').length) {
                if (
                    $('#node-input--input').is(':visible')
                ) {
                    node.input = getFixedInputValue();
                    delete node.inputt;
                }
                if (
                    $('#node-input--input-advanced').is(':visible')
                ) {
                    node.input = $('#node-input--input-advanced')
                        .typedInput('value');
                    node.inputt = $('#node-input--input-advanced')
                        .typedInput('type');
                }
            }
        },

        initializeInput: function(value, type) {
            if (type) {
                $('#node-input--input-advanced').typedInput('value', value);
                $('#node-input--input-advanced').typedInput('type', type);
            } else {
                setFixedInputValue(value);
            }
        },
    };

    window.webthingsio = webthingsio;
})();
