import { MapSchema, Schema, type } from "@colyseus/schema";

export class Player extends Schema {
    @type("number") x: number;
    @type("number") y: number;
    @type("number") z: number;

    @type("boolean") isMoving: boolean;
    @type("boolean") isOnGround: boolean;
    @type("boolean") isJumping: boolean;

    @type("number") trophies: number;
    @type("number") skin: number;
}

export class Timer extends Schema {
    @type("number") time: number;
}

export class MyRoomState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
}