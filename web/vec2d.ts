class Vec2d {
    public x: number;
    public y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public clone() {
        return new Vec2d(this.x, this.y);
    }

    public add(vec: Vec2d) {
        this.x += vec.x;
        this.y += vec.y;
        return this;
    }

    public sub(vec: Vec2d) {
        this.x -= vec.x;
        this.y -= vec.y;
        return this;
    }

    public scale(x: number, y?: number) {
        this.x *= x;
        if (y) {
            x = y;
        }
        this.y *= x;
        return this;
    }

    static wrap({ x, y }: { x: number, y: number }): Vec2d {
        return new Vec2d(x, y);
    }
}
