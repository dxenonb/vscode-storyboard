type ContextMenuItem = ContextMenuOption | ContextMenuSeparator;

interface ContextMenuSeparator {
    separator: true,
}

interface ContextMenuOption {
    text: string;
    aliases: string[] | null;
    action: string;
    separator?: undefined;
}

class ContextMenu {
    private currentHost: HTMLElement | null;
    private node: HTMLElement;

    private resolveHandle: null | ((action: string | null) => void);

    private get active(): boolean {
        return this.resolveHandle !== null;
    }

    public constructor() {
        this.node = _initContextMenu(this.resolve.bind(this));
        this.resolveHandle = null;
        this.currentHost = null;
    }

    public activate(host: HTMLElement, options: ContextMenuItem[]): Promise<string | null> {
        if (this.active) {
            this.resolve(null);
        }
        
        host.appendChild(this.node);
        this.currentHost = host;

        // position the context menu
        // TODO

        // render the options
        const children = this.node.children;
        let i: number;
        for (i = 0; i < options.length; i += 1) {
            const opt = options[i];
            if (opt.separator) {
                _initDivider(this.node, i);
                continue;
            }

            const el = i >= children.length
                ? _initContextItem(this.node)
                : children[i];
            _updateContextItem(el, opt.text, opt.action);
        }

        // remove extra options
        if (i < children.length) {
            while (this.node.children.length > options.length) {
                const el = this.node.lastChild;
                if (el) {
                    this.node.removeChild(el);
                } else {
                    break;
                }
            }
        }

        // store the resolver
        return new Promise((resolve) => {
            this.resolveHandle = resolve;
        });
    }

    public deactivate() {
        console.log('deactivating context menu');
        this.resolve(null);
    }

    private resolve(action: string | null) {
        if (this.resolveHandle) {
            console.log('resolving context menu with', action);
            this.resolveHandle(action);
            this.resolveHandle = null;
            this.currentHost?.removeChild(this.node);
        }
    }
}

function _initContextMenu(tx: (action: string) => void) {
    const root = document.createElement('div');
    root.className = 'context-menu';

    root.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)
            || target.className !== 'context-item'
        ) {
            return;
        }
        const action = target.getAttribute('data-action');
        if (action !== null) {
            tx(action);
        }
    });

    return root;
}

function _initContextItem(host: HTMLElement) {
    const el = document.createElement('p');
    el.className = 'context-item';

    host.appendChild(el);

    return el;
}

function _updateContextItem(el: Element, text: string, action: string) {
    el.setAttribute('data-action', action);
    el.textContent = text;
}

function _initDivider(host: HTMLElement, insertBeforeIndex: number) {
    const el = document.createElement('hr');
    if (insertBeforeIndex >= host.children.length) {
        host.appendChild(el);
    } else {
        host.insertBefore(el, host.children[insertBeforeIndex]);
    }
    return el;
}
