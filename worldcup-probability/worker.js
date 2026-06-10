/* Simulation worker: runs its share of tournaments off the main
   thread, posting counter snapshots as it goes. */

importScripts('data.js', 'sim.js');

onmessage = e => {
  const { n, batch = 5000, opts = {} } = e.data;
  const agg = createAggregator();
  const step = () => {
    agg.run(Math.min(batch, n - agg.runs), opts);
    const snap = agg.snapshot();
    if (agg.runs >= n) postMessage({ ...snap, done: true });
    else { postMessage(snap); setTimeout(step, 0); }
  };
  step();
};
