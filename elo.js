const Elo = require('arpad');

class EpongeElo {
  constructor() {
    this.elo = new Elo({
      default: 32,
      2100: 24,
      2400: 16
    },
    100,
    10000
  )}

  getKMultiplier(scoreDelta, winnerElo, loserElo) {
    const scoreDeltaRatio = Math.log(Math.abs(scoreDelta) + 1)
    const eloDeltaRatio = (2.2 / ((winnerElo - loserElo) * .001 + 2.2));
    return scoreDeltaRatio * eloDeltaRatio
  }

  /**
   * The calculated new rating based on the expected outcone, actual outcome, and previous score
   * with an incorporation of a k ratio multiplier based on game score.
   *
   * @param {Number} expected_score The expected score, e.g. 0.25
   * @param {Number} actual_score The actual score, e.g. 1
   * @param {Number} previous_rating The previous rating of the player, e.g. 1200
   * @param {Float} kMultiplier The ratio calculated based on score delta
   * @return {Number} The new rating of the player, e.g. 1256
   */
  newRating(expectedScore, actualScore, previousRating, kMultiplier) {
    const difference = actualScore - expectedScore;
    const updateKFactor = kMultiplier * this.elo.getKFactor(previousRating);
    const rating = Math.round(previousRating + updateKFactor * difference);

    if (rating < this.elo.minimum) {
      rating = this.elo.minimum;
    } else if (rating > this.elo.maximum) {
      rating = this.elo.maximum;
    }

    return rating;
  };

  gameResultingElo(scoreDelta, winnerElo, loserElo) {
    const [winnerExpectedScore, loserExpectedScore] = this.elo.bothExpectedScores(winnerElo, loserElo);
    const kMultiplier = this.getKMultiplier(scoreDelta, winnerElo, loserElo);
    console.log(kMultiplier);
    const winnerNewRating = this.newRating(winnerExpectedScore, 1, winnerElo, kMultiplier);
    console.log("winner base new rating", this.elo.newRating(winnerExpectedScore, 1, winnerElo))
    console.log("winner new rating", winnerNewRating);
    const loserNewRating = this.newRating(loserExpectedScore, 0, loserElo, kMultiplier);
    console.log("loser base new rating", this.elo.newRating(loserExpectedScore, 0, loserElo))
    console.log("loser new rating", loserNewRating);
    return [winnerNewRating, loserNewRating];
  }
}

module.exports = EpongeElo
