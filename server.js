/*
 The MIT License (MIT)

 Copyright (c) 2013 Piotr Raczynski, pio[dot]raczynski[at]gmail[dot]com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

var inherits = require('super');
var fs = require('fs');
var SqueezeRequest = require('./squeezerequest');
var SqueezePlayer = require('./squeezeplayer');

function SqueezeServer(address, port, username, password, sa) {

    SqueezeServer.super_.apply(this, arguments);
    var defaultPlayer = "00:00:00:00:00:00";
    var self = this;
    this.players = [];
    this.apps = [];
    var subs = {};
    this.on = function(channel, sub) {
        subs[channel] = subs[channel] || [];
        subs[channel].push(sub);
    };

    this.emit = function(channel) {
        var args = [].slice.call(arguments, 1);
        for (var sub in subs[channel]) {
            subs[channel][sub].apply(void 0, args);
        }
    };

    this.playerUpdateInterval = 2000;

    this.getPlayerCount = function(callback) {
        this.request(defaultPlayer, ["player", "count", "?"], callback);
    };

    this.getPlayerId = function(id, callback) {
        this.request(defaultPlayer, ["player", "id", id, "?"], callback);
    };

    this.getPlayerIp = function(playerId, callback) {
        this.request(defaultPlayer, ["player", "ip", playerId, "?"], callback);
    };

    this.getPlayerName = function(playerId, callback) {
        this.request(defaultPlayer, ["player", "name", playerId, "?"], callback);
    };

    this.getSyncGroups = function(callback) {
        this.request(defaultPlayer, ["syncgroups", "?"], callback);
    };

    this.getApps = function(callback) {
        this.request(defaultPlayer, ["apps", 0, 100], callback);
    };

    //pass 0 or empty string "" to display root of music folder
    this.musicfolder = function (folderId, callback) {
        this.request(defaultPlayer, ["musicfolder", 0, 100, "folder_id:" + folderId], callback);
    };

    this.getPlayers = function(callback) {

        self.request(defaultPlayer, ["players", 0, 100], function(reply) {
            if (reply.ok)
                reply.result = reply.result.players_loop;
            callback(reply);
        });
    };

    /**
     * Get a list of the artists from the server
     *
     * @param callback The callback to call with the result
     * @param limit The maximum number of results
     */
    this.getArtists = function(callback, limit) {

        self.request(defaultPlayer, ["artists", 0, limit], function(reply) {
            if (reply.ok)
                reply.result = reply.result.artists_loop;
            callback(reply);
        })
    };

    /**
     * Get a list of the albums from the server
     *
     * @param callback The callback to call with the result
     * @param limit The maximum number of results
     */
    this.getAlbums = function(callback, limit) {

        self.request(defaultPlayer, ["albums", 0, limit], function(reply) {
            if (reply.ok)
                reply.result = reply.result.albums_loop;
            callback(reply);
        })
    };

    /**
     * Get a list of the genre's from the server
     *
     * @param callback The callback to call with the result
     * @param limit The maximum number of results
     */
    this.getGenres = function(callback, limit) {

        self.request(defaultPlayer, ["genres", 0, limit], function(reply) {
            if (reply.ok)
                reply.result = reply.result.genres_loop;
            callback(reply);
        })
    };

    /**
     * Get a 'info' list from the server
     *
     * @param callback The callback to call with the result
     * @param limit The maximum number of results
     * @param slot The query to make to the server [genres, albums, artists, playlists ]
     */
    this.getInfo = function(callback, limit, slot) {

        self.request(defaultPlayer, [slot, 0, limit], function(reply) {
            if (reply.ok)
                reply.result = reply.result[slot + '_loop'];
            callback(reply);
        })
    };

    function register(skipApps) {

        self.getPlayers(function(reply) { //TODO refactor this
            var players = reply.result;
            for (var pl in players) {
                if (!self.players[players[pl].playerid]) { // player not on the list
                    self.players[players[pl].playerid] = new SqueezePlayer(players[pl].playerid, players[pl].name, self.address, self.port, self.username, self.password);
                }
            }
	    if (skipApps) {
                self.emit('register',reply,undefined);
            } else {
                self.emit('registerPlayers',reply);
	   }
        });

        self.on('registerPlayers', function(reply) {

            self.getApps(function (areply){ //TODO refactor this

                if (areply.ok) {
                    var apps = areply.result.appss_loop;
                    var dir = __dirname + '/';
                    fs.readdir(dir, function(err, files) {
                        files.forEach(function(file) {
                            var fil = file.substr(0, file.lastIndexOf("."));
                            for (var pl in apps) {
                                if (fil === apps[pl].cmd) {
                                    var app = require(dir + file);
                                    self.apps[apps[pl].cmd] = new app(defaultPlayer, apps[pl].name, apps[pl].cmd, self.address, self.port, self.username, self.password);
                                    /* workaround, app needs existing player id so first is used here */
                                }
                            }
                        });
                        self.emit('register',reply,areply);
                    });
                } else
                    self.emit('register',reply,areply);
            });
        });
    }

    register(sa);
}

inherits(SqueezeServer, SqueezeRequest);

module.exports = SqueezeServer;
