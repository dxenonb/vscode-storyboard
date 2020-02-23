class Vec2d {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    clone() {
        return new Vec2d(this.x, this.y);
    }

    add(vec: Vec2d) {
        this.x += vec.x;
        this.y += vec.y;
    }

    scale(x: number, y?: number) {
        this.x *= x;
        if (y) {
            x = y;
        }
        this.y *= x;
    }
}
