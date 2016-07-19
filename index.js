import braid from './lib/braid';
import { compress, decompress } from './lib/lzw';
import { parse } from './lib/qs';

const stage = document.getElementById('stage');
const input = document.getElementById('input');
const compressor = document.getElementById('compressor');

const render = () =>
  stage.innerHTML = braid(input.value);

input.addEventListener('input', render);

const update = () =>
  history.replaceState(null, null, `?q=${compress(input.value)}`);

compressor.addEventListener('click', update);

const { q } = parse(location.search);

if (!!q) {
  input.value = decompress(q);
  render();
}
