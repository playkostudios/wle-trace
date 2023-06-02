import {Component} from '@wonderlandengine/api';

/**
 * test-destroy
 */
export class TestDestroy extends Component {
    static TypeName = 'test-destroy';
    /* Properties that are configurable in the editor */
    static Properties = {};
    /* Add other component types here that your component may
     * create. They will be registered with this component */
    static Dependencies = [];

    init() {
        for (let i = 0; i < 10; i++) {
            this.engine.scene.addObject(this.object);
            console.debug('object added');
        }

        this.engine.canvas.addEventListener('keydown', (ev) => {
            if (ev.code === 'Delete') {
                console.debug('delete');
                for (const child of this.object.children) {
                    child.destroy();
                }
            }
        })
    }
}
