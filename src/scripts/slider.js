// Initialise séparément chaque panneau d'exposition doté d'un diaporama.
document.querySelectorAll('.exhibition-panel').forEach((slider) => {
  const slides = slider.querySelectorAll('.slider__el');
  const countNumbers = slider.querySelectorAll('.slide-count__number');
  const btnPrev = slider.querySelector('.slider__btn--prev');
  const btnNext = slider.querySelector('.slider__btn--next');
  const nextPageLink = slider.querySelector('.slide-next-page');
  const artworkSlides = slider.closest('.exhibition')
    .querySelectorAll('.artwork-placeholder > div');

  if (!slides.length || !btnPrev || !btnNext || !nextPageLink) {
    return;
  }

  // Synchronise l'indicateur, les boutons, le lien de suite et les visuels avec la diapositive active.
  const updateCount = () => {
    const currentSlide = slider.querySelector('.slider__el--show');
    const currentIndex = Array.from(slides).indexOf(currentSlide);
    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === slides.length - 1;

    countNumbers.forEach((number, index) => {
      number.classList.toggle('is-active', index === currentIndex);
    });

    btnPrev.disabled = isFirstSlide;
    btnNext.hidden = isLastSlide;
    nextPageLink.hidden = !isLastSlide;
    if (artworkSlides.length) {
      const artworkIndex = Math.min(currentIndex, artworkSlides.length - 1);
      artworkSlides.forEach((artwork, index) => {
        artwork.classList.toggle('is-active', index === artworkIndex);
      });
    }
  };

  // Change de diapositive seulement si l'élément voisin appartient bien au diaporama.
  const nextSlide = () => {
    const elShow = slider.querySelector('.slider__el--show');
    const elNext = elShow.nextElementSibling;

    if (!elNext || !elNext.classList.contains('slider__el')) {
      return;
    }

    elShow.classList.remove('slider__el--show');
    elNext.classList.add('slider__el--show');
    updateCount();
  };

  const prevSlide = () => {
    const elShow = slider.querySelector('.slider__el--show');
    const elPrev = elShow.previousElementSibling;

    if (!elPrev || !elPrev.classList.contains('slider__el')) {
      return;
    }

    elShow.classList.remove('slider__el--show');
    elPrev.classList.add('slider__el--show');
    updateCount();
  };

  // Enregistre les commandes et initialise l'état affiché du panneau.
  btnPrev.addEventListener('click', prevSlide);
  btnNext.addEventListener('click', nextSlide);

  updateCount();
});