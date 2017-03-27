import Carrousel from "dompack-carrousel";


class CarrouselSlideshow
{
  constructor(node, options)
  {
    if (!node)
    {
      console.error("CarrouselSlideshow got null as node.");
      return;
    }

    // FIXME: debug code
    window.slideshowidx++;
    this.slideshowidx = window.slideshowidx;

    var domoptions = dompack.getJSONAttribute(node, "data-carrousel-options");

    this.node = node;
    this.lastautoslidetime = null;
    this.scrolling = false;
    this.ignore_scroll = false; // ignore_scroll caused by our own resizes/relayouts

    this.options = Object.assign(
          { autoplay:               true
          , autoplay_initialdelay:  0       // delay the first start of autoplay to prevent having a lot of slideshows run in sync
          , autoplay_freezeslideduration: 6000 // how long to keep the slide still (FIXME: should be after the transition) before going to the next
          //, autoplay_staypausedfor        // amount of time to keep frozen after a mouseover
          , transitionDuration:    1500
          , eventPassthrough:      true    // makes vertical scrolling keep on working (however at the moment it can cause textual selections)
          , jumpbuttons:           ".carrousel__jumpbutton"
          , debug:                 false
          }, domoptions, options);

    this.autoplaytimer = null;

    this.carrousel = new Carrousel(node
        , { transitionDuration: this.options.transitionDuration
          , eventPassthrough:   this.options.eventPassthrough
          });

    if (this.options.autoplay)
      this.__applyCurrentAutoplay(this.options.autoplay_initialdelay);

    this.jumpbuttonnodes = [];
    if (typeof this.options.jumpbuttons == "string")
      this.jumpbuttonnodes = this.node.querySelectorAll(this.options.jumpbuttons);
    else
      this.jumpbuttonnodes = this.options.jumpbuttons; // assume an array, live nodelist or static nodelist

    for (let idx = 0; idx < this.jumpbuttonnodes.length; idx++)
      this.jumpbuttonnodes[idx].addEventListener("tap", this.__doJumpToSlide.bind(this, idx));

    /*
    // iScroll replacement for "click", for quick response and it won't be triggered during a drag/swipe
    node.addEventListener("tap", doCheckForCarouselVideoTrigger);

    node.addEventListener("click", doOnlyAllowSlideImageLinksOnActiveSlides)
    */

    this.node.addEventListener("wh:activeslidechange", this.onSlideChange.bind(this));

    document.addEventListener("visibilitychange", this.onDocumentVisibilityChange.bind(this));

    // Prevent autoplay overriding user-actions AND the autoscroll to a new slide
    // (such as dragging, flicking, keyboard navigation etc...)
    if(this.carrousel.iscroll)
    {
      this.carrousel.iscroll.on("scrollStart",       this.__onScrollStart.bind(this));
      this.carrousel.iscroll.on("scrollEnd",         this.__onScrollEnd.bind(this));
    }
  }

  relayoutSlides()
  {
    this.ignore_scroll = true;
    this.carrousel.relayoutSlides();
    this.ignore_scroll = false;
  }

  refresh()
  {
    this.ignore_scroll = true;
    this.carrousel.refresh();
    this.ignore_scroll = false;
  }

  onSlideChange(evt)
  {
    this.jumpbuttonnodes[evt.detail.previousactiveidx].classList.remove("active");
    this.jumpbuttonnodes[evt.detail.nextactiveidx].classList.add("active");
  }

  onDocumentVisibilityChange(evt)
  {
    if (document.hidden)
    {
      if (this.options.debug)
        console.log("hidden -> pause");

      this.__pauseAutoplay();
    }
    else
    {
      if (this.options.debug)
        console.log("visible -> unpause");

      if (!this.scrolling)
        this.__unpauseAutoplay();
    }
  }

  __onScrollStart(evt)
  {
    if (this.ignore_scroll)
      return;

    this.scrolling = true;
    this.__pauseAutoplay();
  }

  __onScrollEnd(evt)
  {
    if (this.ignore_scroll)
      return;

    this.scrolling = false;

    // don't unpause if the document is hidden
    if (document.hidden)
      return;

    this.__unpauseAutoplay();
  }

  __pauseAutoplay()
  {
    if (this.options.debug)
      console.log("__pauseAutoplay()", this.slideshowidx, this.node);
    
    clearTimeout(this.autoplaytimer);
    this.autoplaytimer = null;
  }

  __unpauseAutoplay()
  {
    if (this.options.debug)
      console.log("__unpauseAutoplay()", this.slideshowidx, this.node);

    this.__applyCurrentAutoplay();
  }

  __doJumpToSlide(idx)
  {
    console.log(idx);

    // FIXME: animation disabled, the carrousel should offer the ability to find the closes path to the image (forward or backwards) or the animation will look like crap
    //this.carrousel.jumpToSlide(idx, true, true);
    this.carrousel.jumpToSlide(idx);
  }

  __applyCurrentAutoplay(delay)
  {
    if (this.options.debug)
      console.log("__applyCurrentAutoplay");

    if (!delay)
      delay = 0;

    //console.log(this.__nextSlideByTimer);
    if (this.options.autoplay && !document.hidden)
    {
      if (!this.autoplaytimer)
      {
        if (this.options.debug)
          console.log("Setting new timer for auto slide");
        this.autoplaytimer = setTimeout(this.__nextSlideByTimer.bind(this), this.options.autoplay_freezeslideduration + delay);
      }
      else if (this.options.debug)
        console.log("Timer already running...");
    }
    else
    {
      clearTimeout(this.autoplaytimer);
      this.autoplaytimer = null;
    }
  }

  __nextSlideByTimer()
  {
    if (!this.options.autoplay) // did a timer event still get through?
      return;

    this.lastautoslidetime = new Date().getTime();

    this.carrousel.nextSlide();

    this.autoplaytimer = setTimeout(this.__nextSlideByTimer.bind(this), this.options.autoplay_freezeslideduration);
  }
};
