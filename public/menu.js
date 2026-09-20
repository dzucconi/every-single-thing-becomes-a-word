const shell = document.querySelector(".control-shell");
const menu = document.querySelector("#controls");
const toggle = document.querySelector("#menu-toggle");
const linkState = document.querySelector("#link-state");
const mouse = window.matchMedia("(hover: hover) and (pointer: fine)");
let frame;

function setMode() {
  shell.dataset.mode = mouse.matches ? "mouse" : "touch";
  shell.dataset.near = "false";
  linkState.dataset.near = "false";
  toggle.setAttribute("aria-expanded", "false");
}

toggle.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!open));
});

window.addEventListener("pointermove", event => {
  if (!mouse.matches || event.pointerType === "touch") return;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const bounds = menu.getBoundingClientRect();
    const near = event.clientX >= bounds.left - 72 &&
      event.clientX <= bounds.right + 72 &&
      event.clientY >= bounds.top - 80 && event.clientY <= bounds.bottom + 80;
    shell.dataset.near = String(near);
    const readout = linkState.getBoundingClientRect();
    linkState.dataset.near = String(!linkState.hidden &&
      event.clientX >= readout.left - 72 && event.clientX <= readout.right + 72 &&
      event.clientY >= readout.top - 80 && event.clientY <= readout.bottom + 80);
  });
});

function hide() {
  cancelAnimationFrame(frame);
  shell.dataset.near = "false";
  linkState.dataset.near = "false";
}
window.addEventListener("blur", hide);
window.addEventListener("pointerout", event => {
  if (!event.relatedTarget) hide();
});
shell.addEventListener("keydown", event => {
  if (event.key === "Escape" && !mouse.matches) {
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  }
});
mouse.addEventListener("change", setMode);
setMode();
