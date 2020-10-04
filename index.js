const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('./database.js');
const EpongeElo = require('./elo.js');
const bodyParser = require('body-parser');


const app = express();
app.use(bodyParser.json());

(async() => {
  router.get('/player', async function(req, res) {
    const players = await db.all('select * from player');
    res.send(players);
  })

  router.get('/game', async function(req, res) {
    const games = await db.all('select * from game');
    res.send(games);
  })

  router.post('/game', async function(req, res) {
    const { winnerId, loserId, winnerScore, loserScore } = req.body;
    const winner = await db.get(`select * from player where player_id=${winnerId}`);
    const loser = await db.get(`select * from player where player_id=${loserId}`);
    const elo = new EpongeElo();

    const [winnerNewElo, loserNewElo] = elo.gameResultingElo(
      winnerScore - loserScore, winner.elo, loser.elo
    )
    console.log(winnerNewElo, loserNewElo);
    await db.run(`update player set elo=${winnerNewElo} where player_id=${winnerId}`);
    await db.run(`update player set elo=${loserNewElo} where player_id=${loserId}`);
    await db.run(
      'insert into game(winner_id, loser_id, winner_score, loser_score) values ' +
      `(${winnerId}, ${loserId}, ${winnerScore}, ${loserScore})`)
    res.send({winnerNewElo, loserNewElo});
  });

  //add the router
  app.use('/', router);

  try {
    await db.open('eponge.db');
    console.log("connected to eponge db")
    app.listen(3000);
  } catch (e) {
    console.error(e)
  }
})();
