import { shuffle } from '../lib/random.js';

export default {
  name: 'random',
  description: 'Random permutation - the floor everyone must beat',
  solve({ n, rng, report }) {
    const route = shuffle(rng, Array.from({ length: n }, (_, i) => i));
    report(route);
    return route;
  },
};
