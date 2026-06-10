/* Live results from FIFA's public match calendar (keyless, CORS-open).
   Finished matches are locked into every simulation; knockout
   pairings override simulated standings once real teams are known. */

const FIFA_URL = 'https://api.fifa.com/api/v3/calendar/matches'
  + '?idCompetition=17&idSeason=285023&language=en&count=300';

async function fetchLiveResults() {
  const res = await fetch(FIFA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('feed ' + res.status);
  const data = await res.json();

  const locked = { group: {}, koTeams: {}, koResults: {} };
  const fixtures = [];
  let played = 0, total = 0;

  for (const m of data.Results || []) {
    const num = m.MatchNumber;
    if (!num || num === 103) continue; // third-place playoff not modeled
    total++;
    const home = m.Home?.IdCountry, away = m.Away?.IdCountry;
    const known = home && away && teamById[home] && teamById[away];
    const finished = m.MatchStatus === 0;
    const gh = m.Home?.Score, ga = m.Away?.Score;

    if (num <= 72) {
      if (known) fixtures.push({
        num, date: m.Date, home, away, finished,
        gh: finished ? gh : null, ga: finished ? ga : null,
        group: teamById[home].group,
      });
      if (known && finished && gh != null && ga != null) {
        locked.group[`${home}|${away}`] = { gh, ga };
        played++;
      }
    } else if (known) {
      locked.koTeams[num] = { home, away };
      if (finished && gh != null && ga != null) {
        let winner, note = '';
        if (gh !== ga) winner = gh > ga ? home : away;
        else {
          const ph = m.HomeTeamPenaltyScore ?? 0, pa = m.AwayTeamPenaltyScore ?? 0;
          winner = ph > pa ? home : away;
          note = ' pens';
        }
        if (m.ResultType === 2) note = ' aet';
        locked.koResults[num] = { gh, ga, winner, note, home };
        played++;
      }
    }
  }
  return { locked, fixtures, played, total, fetchedAt: Date.now() };
}
