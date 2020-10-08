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
    const players = await db.all('select * from player order by elo desc');
    res.send(players);
  })

  router.get('/game', async function(req, res) {
    const games = await db.all('select * from game');
    res.send(games);
  })

  router.post('/game', async function(req, res) {
    const { player1Id, player2Id, sets, simulate } = req.body;
    const player1 = await db.get(`select * from player where player_id=${player1Id}`);
    const player2 = await db.get(`select * from player where player_id=${player2Id}`);
    let player1TotalScore = 0;
    let player2TotalScore = 0;
    let player1TotalVictory = 0;
    let player2TotalVictory = 0;
    for (let set of sets) {
      player1TotalScore += set.player1Score;
      player2TotalScore += set.player2Score;
      if (set.player1Score > set.player2Score) {
        player1TotalVictory += 1;
      } else {
        player2TotalVictory += 1;
      }
    }
    let winner;
    let loser;
    let scoreDelta;
    if (player1TotalVictory > player2TotalVictory) {
      winner = player1;
      loser = player2;
      scoreDelta = player1TotalScore - player2TotalScore;
    } else {
      winner = player2;
      loser = player1;
      scoreDelta = player2TotalScore - player1TotalScore;
    }
    const elo = new EpongeElo();

    const [winnerNewElo, loserNewElo] = elo.gameResultingElo(scoreDelta, winner.elo, loser.elo);
    if (!simulate) {
      await db.run(`update player set elo=${winnerNewElo} where player_id=${winner.player_id}`);
      await db.run(`update player set elo=${loserNewElo} where player_id=${loser.player_id}`);
      const test = await db.run(
        `insert into game(winner_id, loser_id) values (${winner.player_id}, ${loser.player_id})`
      );
      const { game_id } = await db.get("select last_insert_rowid() as game_id");
      for (let set of sets) {
        await db.run(
          'insert into set_(game_id, player1_id, player2_id, player1_score, player2_score) values ' +
          `(${game_id}, ${set.player1Id}, ${set.player2Id}, ${set.player1Score}, ${set.player2Score})`
        );
      }
    }
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
