// Official NSAA 2026 Class C1 subdistrict brackets (from nsaahome.org/nsaaforms/officials/vbbrackets.php?distid=38..47)
// Seed order = bracket seed. Times are as posted by NSAA.
// 6-team format: g1 #4 v #5, g2 #3 v #6, g3 #1 v W1, g4 #2 v W2, g5 W3 v W4 (final)
// 5-team format: g1 #4 v #5, g2 #3 v #2, g3 #1 v W1, g4 W2 v W3 (final)
const S = (date, time, site) => ({ date, time, site });

export const SUBDISTRICTS = [
  { id: 'C1-1', host: 'Bishop Neumann', teams: ['Bishop Neumann', 'Louisville', 'Lincoln Christian', 'Palmyra', 'Raymond Central'],
    slots: [S('Mon Oct 26', '4:30 PM CT', 'Bishop Neumann HS'), S('Mon Oct 26', '6:00 PM CT', 'Bishop Neumann HS'), S('Mon Oct 26', '7:30 PM CT', 'Bishop Neumann HS'), S('Tue Oct 27', '6:00 PM CT', 'Bishop Neumann HS')] },
  { id: 'C1-2', host: 'Milford', teams: ['Milford', 'Fairbury', 'Auburn', 'Ashland-Greenwood', 'Wahoo'],
    slots: [S('Mon Oct 26', '4:30 PM CT', 'Milford HS'), S('Mon Oct 26', '5:45 PM CT', 'Milford HS'), S('Mon Oct 26', '7:00 PM CT', 'Milford HS'), S('Tue Oct 27', '6:30 PM CT', 'Milford HS')] },
  { id: 'C1-3', host: 'Malcolm', teams: ['Malcolm', 'Lincoln Lutheran', 'Falls City', 'Syracuse', 'Wilber-Clatonia', 'Conestoga'],
    slots: [S('Mon Oct 26', '6:00 PM CT', 'Syracuse Middle School'), S('Mon Oct 26', '6:00 PM CT', 'Falls City HS'), S('Tue Oct 27', '6:00 PM CT', 'Malcolm HS'), S('Tue Oct 27', '7:30 PM CT', 'Malcolm HS'), S('Wed Oct 28', '6:00 PM CT', 'Malcolm HS')] },
  { id: 'C1-4', host: 'Concordia Omaha', teams: ['Concordia Omaha', 'Wayne', 'Battle Creek', 'Arlington', 'Logan View/Scribner-Snyder'],
    slots: [S('Mon Oct 26', '4:30 PM CT', 'Concordia HS'), S('Mon Oct 26', '6:00 PM CT', 'Concordia HS'), S('Mon Oct 26', '7:30 PM CT', 'Concordia HS'), S('Tue Oct 27', '6:00 PM CT', 'Concordia HS')] },
  { id: 'C1-5', host: 'Pierce', teams: ['Pierce', 'Omaha Roncalli Catholic', 'Fort Calhoun', 'David City', 'West Point-Beemer'],
    slots: [S('Mon Oct 26', '4:30 PM CT', 'Pierce HS'), S('Mon Oct 26', '6:00 PM CT', 'Pierce HS'), S('Mon Oct 26', '7:30 PM CT', 'Pierce HS'), S('Tue Oct 27', '6:30 PM CT', 'Pierce HS')] },
  { id: 'C1-6', host: 'Douglas County West', teams: ['Douglas County West', 'Norfolk Catholic', 'North Bend Central', 'Scotus Central Catholic', 'Boys Town', 'Madison'],
    slots: [S('Mon Oct 26', '5:30 PM CT', 'Scotus Central Catholic'), S('Mon Oct 26', '6:30 PM CT', 'North Bend Central'), S('Tue Oct 27', '5:30 PM CT', 'Douglas County West'), S('Tue Oct 27', '7:00 PM CT', 'Douglas County West'), S('Wed Oct 28', '5:30 PM CT', 'Douglas County West')] },
  { id: 'C1-7', host: 'Kearney Catholic', teams: ['Kearney Catholic', 'Gothenburg', 'Cozad', 'Minden', 'Grand Island Central Catholic'],
    slots: [S('Mon Oct 26', '4:30 PM CT', 'Kearney Catholic HS'), S('Mon Oct 26', '5:45 PM CT', 'Kearney Catholic HS'), S('Mon Oct 26', '7:00 PM CT', 'Kearney Catholic HS'), S('Tue Oct 27', '6:00 PM CT', 'Kearney Catholic HS')] },
  { id: 'C1-8', host: 'Aurora', teams: ['Aurora', 'St. Paul', 'ONeill', 'Fillmore Central', 'Broken Bow', 'Gibbon'],
    slots: [S('Mon Oct 26', '6:00 PM CT', 'Fillmore Central HS'), S('Mon Oct 26', '5:30 PM CT', "O'Neill HS"), S('Tue Oct 27', '5:00 PM CT', 'Aurora Middle School'), S('Tue Oct 27', '6:30 PM CT', 'Aurora Middle School'), S('Wed Oct 28', '5:00 PM CT', 'Aurora Middle School')] },
  { id: 'C1-9', host: 'Central City', teams: ['Central City', 'Ord', 'Boone Central', 'Holdrege', 'Wood River', 'Centennial'],
    slots: [S('Mon Oct 26', 'time TBD', 'Holdrege HS'), S('Mon Oct 26', '5:30 PM CT', 'Boone Central HS'), S('Tue Oct 27', '7:00 PM CT', 'Bison Dome'), S('Tue Oct 27', '5:30 PM CT', 'Bison Dome'), S('Wed Oct 28', '6:00 PM CT', 'Bison Dome')] },
  { id: 'C1-10', host: 'Valentine', teams: ['Valentine', 'Ogallala', 'Sidney', 'Chadron', 'Chase County'],
    slots: [S('Mon Oct 26', '4:30 PM CT', 'Valentine HS'), S('Mon Oct 26', '6:00 PM CT', 'Valentine HS'), S('Mon Oct 26', '7:30 PM CT', 'Valentine HS'), S('Wed Oct 28', '5:30 PM CT', 'Valentine HS')] },
];

export function buildGames(s) {
  const id = n => `${s.id}:${n}`;
  const sl = s.slots;
  const g = (n, a, b) => ({ id: id(n), n, a, b, ...sl[n - 1] });
  if (s.teams.length === 6) return [g(1, { seed: 4 }, { seed: 5 }), g(2, { seed: 3 }, { seed: 6 }), g(3, { seed: 1 }, { win: id(1) }), g(4, { seed: 2 }, { win: id(2) }), g(5, { win: id(3) }, { win: id(4) })];
  return [g(1, { seed: 4 }, { seed: 5 }), g(2, { seed: 3 }, { seed: 2 }), g(3, { seed: 1 }, { win: id(1) }), g(4, { win: id(2) }, { win: id(3) })];
}
