import braid from './lib/braid';

const stage = document.getElementById('stage');
const input = document.getElementById('input');

input.addEventListener('input', () =>
  stage.innerHTML = braid(input.value)
);
