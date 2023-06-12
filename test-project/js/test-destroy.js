import {Component, Property} from '@wonderlandengine/api';

/**
 * test-destroy
 */
export class TestDestroy extends Component {
    static TypeName = 'test-destroy';
    /* Properties that are configurable in the editor */
    static Properties = {
        goodMaterial: Property.material(),
        okMaterial: Property.material(),
        badMaterial: Property.material(),
        mesh: Property.mesh(),
    };
    /* Add other component types here that your component may
     * create. They will be registered with this component */
    static Dependencies = [];

    insChildren() {
        const insertMode = this.modeTypes.insert;
        insertMode.modes[insertMode.modeNames[insertMode.modeIdx]]();
    }

    delChildren() {
        const deleteMode = this.modeTypes.delete;
        deleteMode.modes[deleteMode.modeNames[deleteMode.modeIdx]]();
    }

    init() {
        this.modeTypes = {
            insert: {
                modeIdx: 0,
                modes: {
                    plain: () => {
                        console.debug('create 10 plain children');
                        for (let i = 0; i < 10; i++) {
                            this.engine.scene.addObject(this.object);
                            console.debug('object added');
                        }
                    },
                    singleMarker: () => {
                        console.debug('create meshed child with meshed grandchild');
                        const child = this.engine.scene.addObject(this.object);
                        child.addComponent('mesh', { mesh: this.mesh, material: this.goodMaterial });
                        const grandchild = this.engine.scene.addObject(child);
                        grandchild.addComponent('mesh', { mesh: this.mesh, material: this.okMaterial });
                        console.debug('object added');
                    },
                },
            },
            delete: {
                modeIdx: 0,
                modes: {
                    normal: () => {
                        console.debug('delete all children');
                        for (const child of this.object.children) {
                            child.destroy();
                        }
                    },
                    reparentGrandchildren: () => {
                        console.debug('delete all children, but reparent grandchildren');
                        for (const child of this.object.children) {
                            child.destroy();
                        }
                    },
                },
            },
        }

        this.modeTypes.insert.modeNames = Object.getOwnPropertyNames(this.modeTypes.insert.modes);
        this.modeTypes.delete.modeNames = Object.getOwnPropertyNames(this.modeTypes.delete.modes);

        this.engine.canvas.addEventListener('keydown', (ev) => {
            if (ev.code === 'Delete') {
                this.delChildren();
            } else if (ev.code === 'Insert') {
                this.insChildren();
            } else if (ev.code === 'End') {
                this.insChildren();
                this.delChildren();
            } else if (ev.code === 'PageUp') {
                const modeType = ev.shiftKey ? 'delete' : 'insert';
                const wantedMode = this.modeTypes[modeType];
                if (--wantedMode.modeIdx < 0) {
                    wantedMode.modeIdx = wantedMode.modeNames.length - 1;
                }
                console.debug('new insert mode:', wantedMode.modeNames[wantedMode.modeIdx]);
            } else if (ev.code === 'PageDown') {
                const modeType = ev.shiftKey ? 'delete' : 'insert';
                const wantedMode = this.modeTypes[modeType];
                if (++wantedMode.modeIdx >= wantedMode.modeNames.length) {
                    wantedMode.modeIdx = 0;
                }
                console.debug('new insert mode:', wantedMode.modeNames[wantedMode.modeIdx]);
            }
        })
    }
}
