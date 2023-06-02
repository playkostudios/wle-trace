export class WLETraceController {
    constructor() {
        this.features = new Map();
    }

    registerFeature(id) {
        this.features.set(id, false);
    }

    isEnabled(id) {
        return this.features.get(id);
    }

    toggle(id, on = null) {
        const isOn = this.features.get(id);
        if (isOn === undefined) {
            console.debug(`[wle-trace CONTROLLER] Ignored unknown feature "${id}"`);
            return null;
        }

        if (on === null) {
            on = !isOn;
        } else if (on === isOn) {
            console.debug(`[wle-trace CONTROLLER] Feature "${id}" is already ${isOn ? 'on' : 'off'}`);
            return isOn;
        }

        this.features.set(id, !isOn);

        console.debug(`[wle-trace CONTROLLER] Toggled feature "${id}" (is now ${isOn ? 'off' : 'on'})`);
        return !isOn;
    }

    enable(id) {
        this.toggle(id, true);
    }

    disable(id) {
        this.toggle(id, false);
    }

    toggleAll(on = null) {
        for (const id of this.features.keys()) {
            this.toggle(id, on);
        }
    }

    enableAll() {
        this.toggleAll(true);
    }

    disableAll() {
        this.toggleAll(false);
    }

    toggleWithPrefix(prefix, on = null) {
        for (const id of this.features.keys()) {
            if (typeof id === 'string' && id.startsWith(prefix)) {
                this.toggle(id, on);
            }
        }
    }

    enableWithPrefix(prefix) {
        this.toggleWithPrefix(prefix, true);
    }

    disableWithPrefix(prefix) {
        this.toggleWithPrefix(prefix, false);
    }

    list() {
        for (const [id, isOn] of this.features) {
            console.debug(`[wle-trace CONTROLLER] - "${id}": ${isOn ? 'on' : 'off'}`);
        }
    }
}

export const controller = new WLETraceController();