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
                const node = buildFixedInput(description);
                node.style.width = '70%';
                $('div#input-row').attr(
                    'input-schema',
                    JSON.stringify(description),
                );
                if (description.type === 'object') {
                    node.style.width = 'calc(100px + 70%)';
                }
                $('div#input-row').append(node);
                $('div#inputMode-row').show();
            }
        }
        if (propagate) {
            if (!$('#node-input--inputMode').is(':visible')) {
                $('#node-input--inputMode')[0].selectedIndex = 0;
            }
            $('#node-input--input-advanced').typedInput('value', '');
            $('#node-input--input-advanced').typedInput(
                'type', 'msg',
            );
            webthingsio.inputModeChanged(a);
        }
    }

    function buildFixedInput(description, id = 'node-input--input') {
        let node;

        if (description.type === 'object') {
            node = document.createElement('DIV');
        } else if (Array.isArray(description.enum)) {
            node = document.createElement('SELECT');
        } else {
            node = document.createElement('INPUT');
        }

        node.id = id;
        node.style.width = '100%';

        if (description.type === 'object') {
            node.style.borderLeft = '6px solid #ccc';
            node.style.paddingLeft = '2px';
            for (const input in description.properties) {
                const labelnode = document.createElement('LABEL');
                labelnode.setAttribute('for', `${id}/${input}`);
                labelnode.innerText = input;
                node.append(labelnode);
                const childnode = buildFixedInput(
                    description.properties[input],
                    `${id}/${input}`,
                );
                node.append(childnode);
            }
            return node;
        }

        if (Array.isArray(description.enum)) {
            const elements = description.enum.map((element) => {
                return {
                    text: element.title || element,
                    value: element,
                };
            });
            initSelect(node, elements);
            return node;
        }

        switch (description.type) {
            case 'boolean':
                node.type = 'checkbox';
                break;
            case 'number': case 'integer':
                node.type = 'number';
                if (typeof description.maximum === 'number') {
                    node.max = description.maximum;
                }
                if (typeof description.minimum === 'number') {
                    node.min = description.minimum;
                }
                if (description.type === 'integer') {
                    node.step = 1;
                    node.pattern = '\\d*';
                } else {
                    node.step = 'any';
                }
                node.value = 0;
                if (node.max) {
                    node.value = node.max;
                }
                if (node.min) {
                    node.value = node.min;
                }
                break;
            default:
                if (description['@type'] === 'ColorProperty') {
                    node.type = 'color';
                } else {
                    node.type = 'text';
                }
                break;
        }

        return node;
    }

    function getFixedInputValue(id, description) {
        switch (description.type) {
            case 'object': {
                const val = {};
                for (const input in description.properties) {
                    val[input] = getFixedInputValue(
                        `${id}/${input}`,
                        description.properties[input],
                    );
                }
                return val;
            }
            case 'boolean':
                return $(`[id='${id}']`).is(':checked');
            default:
                return $(`[id='${id}']`).val();
        }
    }

    function setFixedInputValue(id, description, value) {
        switch (description.type) {
            case 'object':
                for (const input in description.properties) {
                    setFixedInputValue(
                        `${id}/${input}`,
                        description.properties[input],
                        value[input],
                    );
                }
                break;
            case 'boolean':
                $(`[id='${id}']`).prop('checked', value);
                break;
            default:
                $(`[id='${id}']`).prop('value', value);
                break;
        }
    }

    function hideFixedInput() {
        $('div#input-row').hide();
        $('div#input-row').removeAttr('input-schema');
        $('#node-input--input').remove();
    }

    function hideAdvancedInput() {
        $('div#input-advanced-row').hide();
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
        const allrows = ['thing', 'property', 'event', 'action'];
        for (const row of allrows) {
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
                    const description = JSON.parse(
                        $('#input-row').attr('input-schema'),
                    );
                    let value = getFixedInputValue(
                        'node-input--input',
                        description,
                    );
                    if (description.type === 'object') {
                        value = JSON.stringify(value);
                    }
                    node.input = value;
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
            } else if ($('#node-input--input').length) {
                const description = JSON.parse(
                    $('#input-row').attr('input-schema'),
                );
                if (description.type === 'object') {
                    value = JSON.parse(value);
                }
                setFixedInputValue(
                    'node-input--input',
                    description,
                    value,
                );
            }
        },
    };

    window.webthingsio = webthingsio;
})();
