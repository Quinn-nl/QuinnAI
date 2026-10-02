/* De engine bestaat uit meerdere classic scripts die globals delen. De volgorde hier is de laadvolgorde
   (index.html, test.js en check.js gebruiken allemaal deze ene lijst). */
module.exports = ['kern', 'geheugen', 'sjablonen', 'herkenning', 'inhoud', 'theater', 'begrip', 'brein', 'persoonlijkheid']
  .map(n => 'assets/js/engine/' + n + '.js');
