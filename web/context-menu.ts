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

    public activate(
        host: HTMLElement,
        pos: Vec2d,
        options: ContextMenuItem[],
    ): Promise<string | null> {
        if (this.active) {
            this.resolve(null);
        }

        host.appendChild(this.node);
        this.currentHost = host;

        // clear all children
        // TODO: caching? does it really matter?
        while (this.node.lastChild) {
            const el = this.node.lastChild;
            this.node.removeChild(this.node.lastChild);
        }

        // render the options
        const children = this.node.children;
        for (let i = 0; i < options.length; i += 1) {
            // TODO: Refactor -- I had started on caching but then said screw it
            const opt = options[i];
            if (opt.separator) {
                _initDivider(this.node, i);
                continue;
            }

            const el = _initContextItem(this.node);
            _updateContextItem(el, opt.text, opt.action);
        }

        // position the context menu
        const computedStyle =this.computeStyle(pos);
        this.node.setAttribute('style', computedStyle);

        // store the resolver
        return new Promise((resolve) => {
            this.resolveHandle = resolve;
        });
    }

    public deactivate() {
        console.log('deactivating context menu');
        this.resolve(null);
    }

    /// Test if an event originated inside the context menu.
    public spawnedEvent(event: Event): boolean {
        if (!(event.target instanceof HTMLElement)) {
            return false;
        }
        return event.target.matches('.context-menu, .context-menu *');
    }

    private computeStyle(pos: Vec2d): string {
        const maxHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        const rect = this.node.getBoundingClientRect();
        const halfHeight = rect.height / 2;

        const flipX = pos.x + rect.width > windowWidth;
        // this seems to be the behavior of VSCode's context menu
        const yShift = Math.max(0, (pos.y + rect.height) - maxHeight);
        const flipY = rect.height < maxHeight && yShift > halfHeight;

        const x = flipX ? pos.x - rect.width : pos.x;
        const y = flipY ? pos.y - rect.height : pos.y - yShift;

        return `top: ${y}px; left: ${x}px; max-height: ${maxHeight}px;`;
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
