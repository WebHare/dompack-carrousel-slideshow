import * as dompack from "dompack";
import Carrousel from "@webhare/dompack-carrousel";


window.__dompack_cslideshow_idx = 0;
window.__dompack_cslideshows = [];



let __observer;
if (window.IntersectionObserver)
  __observer = new IntersectionObserver(checkSlideshowVisibility);

document.addEventListener("visibilitychange", onDocumentVisibilityChange);


function onDocumentVisibilityChange()
{
  for(let slideshow of window.__dompack_cslideshows)
    slideshow.__handleVisibilityChange();
}

function checkSlideshowVisibility(entries, observer)
{
  //console.log("checkSlideshowVisibility");
  //console.info(entries);

  let visible = [];
  let invisible = [];
  for (let entry of entries)
  {
    if (entry.isIntersecting)
      visible.push(entry.target);
    else
      invisible.push(entry.target);
  }

  for(let slideshow of window.__dompack_cslideshows)
  {
    slideshow.inviewport = visible.indexOf(slideshow.node) > -1;
    slideshow.__handleVisibilityChange();
  }
}



export default class CarrouselSlideshow
{
  constructor(node, options)
  {
    if (!node)
    {
      console.error("CarrouselSlideshow got null as node.");
      return;
    }

    window.__dompack_cslideshow_idx++; // used for anonymous this.option.name
    window.__dompack_cslideshows.push(this);

    var domoptions = dompack.getJSONAttribute(node, "data-carrousel-options");

    this.node = node;
    this.inviewport = this.__determineInViewport(node);
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
          , updateviewportheight:  false

          , jumpbuttons:           ".carrousel__jumpbutton" // FIXME
          , jumpbutton_selectedclass: "active" // FIXME
          , buttonprevious:        null
          , buttonnext:            null
          , debug:                 false
          , autoresize:            true
          , name:                  "slideshow" + window.__dompack_cslideshow_idx
          }, domoptions, options);

    if (this.options.debug)
      console.log("CarrouselSlideshow options", this.options);

    this.autoplaytimer = null;
    this.playing = this.options.autoplay;

    this.carrousel = new Carrousel(node
        , { transitionDuration:   this.options.transitionDuration
          , eventPassthrough:     this.options.eventPassthrough
          , gap:                  0
          , updateviewportheight: this.options.updateviewportheight
          });

    this.jumpbuttonnodes = [];
    if (typeof this.options.jumpbuttons == "string")
      this.jumpbuttonnodes = this.node.querySelectorAll(this.options.jumpbuttons);
    else
      this.jumpbuttonnodes = this.options.jumpbuttons; // assume an array, live nodelist or static nodelist

// ADDME: use tap if in carrousel viewport or click if outside
    for (let idx = 0; idx < this.jumpbuttonnodes.length; idx++)
      this.jumpbuttonnodes[idx].addEventListener("tap", this.__doJumpToSlide.bind(this, idx));

    if (this.options.buttonprevious)
      this.options.buttonprevious.addEventListener("click", this.__handlePrevButton.bind(this));

    if (this.options.buttonnext)
      this.options.buttonnext.addEventListener("click", this.__handleNextButton.bind(this));

    /*
    // iScroll replacement for "click", for quick response and it won't be triggered during a drag/swipe
    node.addEventListener("tap", doCheckForCarouselVideoTrigger);

    node.addEventListener("click", doOnlyAllowSlideImageLinksOnActiveSlides)
    */

    this.node.addEventListener("wh:activeslidechange", this.onSlideChange.bind(this));

    // Prevent autoplay overriding user-actions AND the autoscroll to a new slide
    // (such as dragging, flicking, keyboard navigation etc...)
    if(this.carrousel.iscroll)
    {
      this.carrousel.iscroll.on("scrollStart",       this.__onScrollStart.bind(this));
      this.carrousel.iscroll.on("scrollEnd",         this.__onScrollEnd.bind(this));
    }

    if (this.options.autoresize)
    {
      if (this.options.debug)
        console.info("AUTORESIZE enabled");

      let bindedrefresh = this.relayoutSlides.bind(this);
      window.addEventListener("resize", bindedrefresh);
      document.addEventListener("DOMContentLoaded", bindedrefresh); // may help, but at this time the event might already have fired
      window.addEventListener("load", bindedrefresh); // Fix/workaround Safari reporting the wrong height for the first slide
    }

    if (__observer)
      __observer.observe(node);

    if (this.playing)
      this.__applyCurrentAutoplay(this.options.autoplay_initialdelay);
  }

  __determineInViewport(node)
  {
    let viewport = document.body.getBoundingClientRect();
    let viewportheight = viewport.height;
    let slideshowbounds = node.getBoundingClientRect();
    return slideshowbounds.bottom >= 0 || slideshowbounds.top <= viewportheight;
  }

  __handlePrevButton()
  {
    this.carrousel.previousSlide();
  }

  __handleNextButton()
  {
    this.carrousel.nextSlide();
  }

  relayoutSlides()
  {
    console.info("relayoutSlides");
    this.ignore_scroll = true;
    this.carrousel.relayoutSlides();
    this.carrousel.refresh();
    this.ignore_scroll = false;
  }


  pause()
  {
    this.playing = false;
    this.__applyCurrentAutoplay();
  }

  play()
  {
    this.playing = true;
    this.__applyCurrentAutoplay();
  }


  refresh()
  {
    this.relayoutSlides();
/*
    console.info("refresh");
    this.ignore_scroll = true;
    this.carrousel.refresh();
    this.ignore_scroll = false;
*/
  }

  onSlideChange(evt)
  {
    this.jumpbuttonnodes[evt.detail.previousactiveidx].classList.remove(this.options.jumpbutton_selectedclass);
    this.jumpbuttonnodes[evt.detail.nextactiveidx].classList.add(this.options.jumpbutton_selectedclass);
  }

  __handleVisibilityChange()
  {
    console.info( this.options.name
                , "Page visible: "       , !document.hidden
                , "Slideshow in viewport", this.inviewport
                );

    this.__applyCurrentAutoplay();
  }

  __onScrollStart(evt)
  {
    if (this.ignore_scroll)
      return;

    this.scrolling = true;
    //this.__pauseAutoplay();
  }

  __onScrollEnd(evt)
  {
    if (this.ignore_scroll)
      return;

    this.scrolling = false;
/*
    // don't unpause if the document is hidden
    if (document.hidden)
      return;

    this.__unpauseAutoplay();
*/
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

    // During scrolling we must finish the scroll.
    // After the scroll has finished this function will be called again to schedule a slide change if needed.
    if (this.scrolling)
    {
      if (this.options.debug)
        console.log("Not scheduling or cancelling a slide during scrolling.")
      return;
    }

    //console.log(this.__nextSlideByTimer);
    if (this.playing && !document.hidden && this.inviewport)
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
      if (this.options.debug)
        console.log("No autoplay", { play: this.playing, dochidden: document.hidden, inviewport: this.inviewport });

      if (this.autoplaytimer)
      {
        clearTimeout(this.autoplaytimer);
        this.autoplaytimer = null;
      }
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
