"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyRoom = void 0;
const core_1 = require("@colyseus/core");
const MyRoomState_1 = require("./schema/MyRoomState");
class MyRoom extends core_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 12;
        this.lobbyModes = [{ name: 'wait', time: 3 },
            { name: 'vote', time: 5 },
            { name: 'game', time: 60 }
        ];
        this.modeVotes = [0, 0, 0];
        this.gameModes = [
            "Obby",
            "DropBlocks",
            "ColorRace",
            "RedLight",
            "GlassBridge"
        ];
        this.gameModeIds = [];
        this.gamesToVote = [];
        this.currentModeID = 0;
        this.currentGameID = 0;
        this.currentTime = this.lobbyModes[this.currentModeID].time;
        this.winner = '';
        this.gameStarted = false;
        this.gamers = [];
    }
    onCreate(options) {
        this.setState(new MyRoomState_1.MyRoomState());
        this.startLobbyMode(this.currentModeID);
        this.updateTime();
        this.onMessage("updatePosition", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            player.x = data.x;
            player.y = data.y;
            player.z = data.z;
        });
        this.onMessage("updateAnims", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            player.isMoving = data.isMoving;
            player.isOnGround = data.isOnGround;
            player.isJumping = data.isJumping;
        });
        this.onMessage("UpdateTrophies", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            player.trophies = data.trophies;
        });
        this.onMessage("changeSkin", (client, data) => {
            const player = this.state.players.get(client.sessionId);
            player.skin = data.skinId;
        });
        this.onMessage("addVote", (client, data) => {
            this.addVote(data.id);
        });
        this.onMessage("removeVote", (client, data) => {
            this.removeVote(data.id);
        });
        this.onMessage("ConnectToGame", (client) => {
            this.gamers.push(client.sessionId);
        });
        this.onMessage("Lose", (client) => {
            let index = this.gamers.indexOf(client.sessionId);
            if (index > -1)
                this.gamers.splice(index, 1);
        });
        this.onMessage("GlassBridge:DestroyCell", (client, data) => {
            this.broadcast('GlassBridge:Destroy', data.id);
        });
    }
    onJoin(client, options) {
        console.log(client.sessionId, "joined!");
        // create Player instance
        const player = new MyRoomState_1.Player();
        // place Player at a random position
        player.x = 0;
        player.y = 0.5;
        player.z = 0;
        player.isMoving = false;
        player.isOnGround = true;
        player.isJumping = false;
        player.skin = 0;
        player.trophies = 0;
        this.setColorfulRoad();
        client.send('RoomModeChanged', { mode: this.lobbyModes[this.currentModeID], time: this.currentTime });
        this.state.players.set(client.sessionId, player);
    }
    onLeave(client, consented) {
        console.log(client.sessionId, "left!");
        let index = this.gamers.indexOf(client.sessionId);
        if (index > -1)
            this.gamers.splice(index, 1);
        this.state.players.delete(client.sessionId);
    }
    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }
    updateTime() {
        this.clock.start();
        this.lobbyTimer = this.clock.setInterval(() => {
            this.currentTime--;
            if (this.currentTime < 1 || (this.gamers.length < 1 && this.gameStarted)) {
                if (this.currentModeID < this.lobbyModes.length - 1)
                    this.currentModeID++;
                else
                    this.currentModeID = 0;
                if (this.currentModeID == 2 && this.modeVotes[0] == 0 && this.modeVotes[1] == 0 && this.modeVotes[2] == 0)
                    this.currentModeID = 1;
                this.startLobbyMode(this.currentModeID);
            }
            this.broadcast('UpdateRoundTime', this.currentTime);
        }, 1000);
    }
    startLobbyMode(modeID) {
        this.currentTime = this.lobbyModes[modeID].time;
        this.broadcast('StartLobbyMode', modeID);
        switch (modeID) {
            case 0:
                this.endRound();
                break;
            case 1:
                this.startVote();
                break;
            case 2:
                this.startGame();
                break;
        }
    }
    addVote(id) {
        this.modeVotes[id]++;
    }
    removeVote(id) {
        if (this.modeVotes[id] > 0)
            this.modeVotes[id]--;
    }
    startVote() {
        this.modeVotes = [0, 0, 0];
        this.gameModeIds = [];
        for (let i = 0; i < this.gameModes.length; i++) {
            this.gameModeIds.push(i);
        }
        this.gamesToVote = this.gameModeIds.slice(0);
        while (this.gamesToVote.length > 3) {
            let indexToSplice = Math.floor(Math.random() * this.gameModes.length);
            this.gamesToVote.splice(indexToSplice, 1);
        }
        this.broadcast('ChangeGamesToVote', { games: this.gamesToVote });
    }
    startGame() {
        const maxVotes = Math.max(...this.modeVotes);
        const chosedID = this.modeVotes.indexOf(maxVotes);
        const gameID = this.gamesToVote[chosedID];
        this.gameStarted = true;
        this.currentGameID = gameID;
        this.broadcast('StartGame', gameID);
        switch (gameID) {
            case 0:
                this.setGlassBridge(3);
                break;
        }
        // let time = 0;
        // switch (gameID) {
        //   case 0:
        //     let eliminationTime = 50;
        //     this.gameTimer = this.clock.setInterval(() => {
        //       time++;
        //       if (time == 45) this.broadcast('Obby:EliminationCountdown');
        //       if (time == eliminationTime) this.broadcast('Obby:Elimination');
        //     }, 1000);
        //     break;
        //   case 1:
        //     let spawnCD = 30;
        //     this.gameTimer = this.clock.setInterval(() => {
        //       time++;
        //       let id = Math.min(8, Math.floor(Math.random() * 10));
        //       if (time == spawnCD) {
        //         this.broadcast('DropBlocks:SpawnBlock', { id: id });
        //         time = 0;
        //         if (spawnCD >= 12) spawnCD--;
        //       }
        //     }, 100);
        //     break;
        //   case 2:
        //     this.setRandomColor();
        //     this.gameTimer = this.clock.setInterval(() => {
        //       time++;
        //       if (time % 8 == 0 && time < 56) {
        //         this.setRandomColor();
        //       }
        //     }, 1000)
        //     break;
        // }
    }
    setRandomColor() {
        let color = Math.floor(Math.random() * 7);
        this.broadcast('ColorfulRace:ChangeColor', { color: color });
    }
    setColorfulRoad() {
        let roadCells = [];
        for (let i = 0; i < 336; i++) {
            roadCells.push(Math.floor(Math.random() * 7));
        }
        this.broadcast('ColorfulRace:SetRoad', { arr: roadCells });
    }
    setGlassBridge(rowsCount) {
        let rows = [];
        for (let i = 0; i < rowsCount; i++) {
            rows.push(Math.floor(Math.random() * 2));
        }
        this.broadcast('GlassBridge:SetRoad', { arr: rows });
    }
    endRound() {
        this.gameStarted = false;
        this.currentGameID = 0;
        this.broadcast('EndRound');
        if (!!this.gameTimer)
            this.gameTimer.clear();
        this.gamers = [];
    }
}
exports.MyRoom = MyRoom;
