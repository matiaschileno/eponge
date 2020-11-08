const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('./database.js');
const EpongeElo = require('./elo.js');
const bodyParser = require('body-parser');


const app = express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static('public'))
app.set('view engine', 'ejs');

(async() => {
  router.get('/player', async (_, res) => {
    const players = await db.all('select * from player order by elo desc');
    res.send(players);
  })

  router.get('/game', async (_, res) => {
    const games = await db.all('select * from game');
    res.send(games);
  })

  router.post('/game', async (req, res) => {
    const { player1Id, player2Id, player1Scores, player2Scores, simulate } = req.body;
    const player1 = await db.get(`select * from player where player_id=${player1Id}`);
    const player2 = await db.get(`select * from player where player_id=${player2Id}`);
    let player1TotalScore = 0;
    let player2TotalScore = 0;
    let player1TotalVictory = 0;
    let player2TotalVictory = 0;
    const sets = [];
    for (let i = 0; i <= 2; i++) {
      let player1SetScore = +player1Scores[i];
      let player2SetScore = +player2Scores[i];
      if (player1SetScore && player2SetScore) {
        player1TotalScore += player1SetScore;
        player2TotalScore += player2SetScore;
        if (player1SetScore > player2SetScore) {
          player1TotalVictory += 1;
        } else {
          player2TotalVictory += 1;
        }
        sets.push([player1SetScore, player2SetScore]);
        if (player1TotalVictory === 2 || player2TotalVictory ===2) {
          break;
        }
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
      await db.run(
        `insert into game(winner_id, loser_id) values (${winner.player_id}, ${loser.player_id})`
      );
      const { game_id } = await db.get("select last_insert_rowid() as game_id");
      for (let set of sets) {
        console.log(set)
        await db.run(
          'insert into set_(game_id, player1_id, player2_id, player1_score, player2_score) values ' +
          `(${game_id}, ${player1Id}, ${player2Id}, ${set[0]}, ${set[1]})`
        );
      }
    }
    res.redirect(303, "/");
  });

  router.get('/', async (req, res) => {
    const players = await db.all('select * from player order by elo desc');
    res.render('index', { players });
  })

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
