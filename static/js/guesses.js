// The answers on the opening slide, for people reading the page.
//
// In the deck the two columns are reveal fragments: the room looks at the
// turning cloud, says what it is, and one press of space brings up what
// everyone else said. A page has no fragments and no presenter, and the
// whole point of the slide is that you look first and are told afterwards
// - so a page that prints the answers beside the picture has given the
// game away before the reader has had a chance to play.
//
// Hence a button. Same order of events, reader's own pace.
//
// The columns are laid out either side of the illustration by CSS and are
// only made invisible here, not removed, so revealing them does not move
// the flower.

/**
 * Slide mode, read from the URL rather than from the DOM.
 *
 * `?view=slides` is what the theme itself switches on, and it is true
 * before anything has loaded. Looking for `.reveal` instead is a race: the
 * theme only adds that class on DOMContentLoaded, so depending on which
 * handler runs first this could decide it was on a page, build the button
 * and leave it sitting on the slide.
 */
const deck = () => new URLSearchParams(window.location.search).get('view') === 'slides';

function setup() {
  if (deck()) return;

  for (const hidden of document.querySelectorAll('.guesses, .reveal-note')) {
    const section = hidden.closest('section');
    // A slide can hold two columns of answers and a note, and wants one
    // button between all of them, so the first one here claims it.
    if (!section || section.dataset.reveal) continue;
    section.dataset.reveal = 'hidden';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'guesses-reveal';
    button.textContent = section.querySelector('.guesses')
      ? 'Reveal answers' : 'Reveal note';
    button.addEventListener('click', () => {
      section.dataset.reveal = 'shown';
      button.remove();
    });
    section.append(button);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
