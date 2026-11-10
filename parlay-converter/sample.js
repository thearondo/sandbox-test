// SAMPLE DATA ONLY. Invented players, games, and prices for layout and math demos. Not real, not from any book.
var Sample = {
  sports: {
    Basketball: { stats: ['Points', 'Rebounds', 'Assists'], players: {
      'Sample Player A': { Points: [22, 31, 18, 27, 25, 29, 16, 24, 33, 21], Rebounds: [7, 9, 5, 11, 6, 8, 4, 10, 7, 6], Assists: [5, 3, 6, 4, 8, 2, 5, 7, 3, 6] },
      'Sample Player B': { Points: [14, 19, 26, 12, 21, 17, 23, 15, 20, 18], Rebounds: [3, 5, 4, 6, 2, 5, 3, 4, 7, 5], Assists: [9, 11, 7, 10, 6, 12, 8, 9, 5, 10] } },
      lines: { Points: [15, 20, 25], Rebounds: [4, 6, 8], Assists: [4, 6, 8] }, opp: ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Team 6', 'Team 7', 'Team 8', 'Team 9', 'Team 10'] },
    Football: { stats: ['Pass Yds', 'Rush Yds', 'Receptions'], players: {
      'Sample Player C': { 'Pass Yds': [248, 301, 199, 275, 230, 322, 210, 266, 289, 241], 'Rush Yds': [12, 25, 8, 31, 5, 19, 22, 14, 9, 27], Receptions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      'Sample Player D': { 'Pass Yds': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'Rush Yds': [64, 88, 41, 102, 75, 59, 93, 47, 81, 70], Receptions: [3, 5, 2, 4, 6, 3, 1, 4, 5, 2] } },
      lines: { 'Pass Yds': [200, 250, 300], 'Rush Yds': [50, 75, 100], Receptions: [2, 3, 4] }, opp: ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Team 6', 'Team 7', 'Team 8', 'Team 9', 'Team 10'] }
  },
  // Sample prices for an Over/Under on the selected prop, by state. Book names are placeholders on purpose.
  books: ['Book A', 'Book B', 'Book C'],
  odds: { MD: [[-110, -110], [+105, -125], [-115, -105]], NJ: [[-105, -115], [-110, -110], [+100, -120]], NY: [[-120, +100], [-110, -110], [-115, -105]], PA: [[+110, -130], [-105, -115], [-110, -110]] },
  open: [-110, -110]
};
