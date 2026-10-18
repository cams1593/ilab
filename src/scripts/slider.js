document.querySelectorAll('.exhibition-panel').forEach((slider) => {
  const slides = slider.querySelectorAll('.slider__el');
  const countNumbers = slider.querySelectorAll('.slide-count__number');
  const btnPrev = slider.querySelector('.slider__btn--prev');
  const btnNext = slider.querySelector('.slider__btn--next');

  if (!slides.length || !btnPrev || !btnNext) {
    return;
  }

  const updateCount = () => {
    const currentSlide = slider.querySelector('.slider__el--show');
    const currentIndex = Array.from(slides).indexOf(currentSlide);

    countNumbers.forEach((number, index) => {
      number.classList.toggle('is-active', index === currentIndex);
    });
  };

  const nextSlide = () => {
    const elShow = slider.querySelector('.slider__el--show');
    const elNext = elShow.nextElementSibling;

    elShow.classList.remove('slider__el--show');
    if (elNext && elNext.classList.contains('slider__el')) {
      elNext.classList.add('slider__el--show');
    } else {
      elShow.parentElement.firstElementChild.classList.add('slider__el--show');
    }
    updateCount();
  };

  const prevSlide = () => {
    const elShow = slider.querySelector('.slider__el--show');
    const elPrev = elShow.previousElementSibling;

    elShow.classList.remove('slider__el--show');
    if (elPrev) {
      elPrev.classList.add('slider__el--show');
    } else {
      elShow.parentElement.lastElementChild.classList.add('slider__el--show');
    }
    updateCount();
  };

  btnPrev.addEventListener('click', prevSlide);
  btnNext.addEventListener('click', nextSlide);

  document.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft') {
      event.preventDefault();
      prevSlide();
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      nextSlide();
    }
  });

  updateCount();
});